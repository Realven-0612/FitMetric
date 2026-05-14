import React, { createContext, useContext, useEffect, useState } from "react";
import { User, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut } from "firebase/auth";
import { auth, db } from "../lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { fetchUserData } from "../services/firebaseService";
import { useStore } from "../lib/store";

interface AuthContextType {
  user: User | null;
  /** True until Firebase has resolved the initial auth state AND loaded Firestore data */
  loading: boolean;
  /** True only when the signed-in user has a complete profile (weight + height) */
  hasCompleteProfile: boolean;
  signInWithGoogle: () => Promise<{ hasProfile: boolean }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  hasCompleteProfile: false,
  signInWithGoogle: async () => ({ hasProfile: false }),
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasCompleteProfile, setHasCompleteProfile] = useState(false);
  const hydrateStore = useStore(state => state.hydrateStore);

  // Load a Firebase user's data into the store. Returns true if profile is complete.
  const loadUserData = async (firebaseUser: User): Promise<boolean> => {
    try {
      useStore.getState().resetStore();
      const userDocRef = doc(db, "users", firebaseUser.uid);
      const docSnap = await getDoc(userDocRef);

      let profileComplete = false;

      if (!docSnap.exists()) {
        // Brand new user — create minimal doc
        await setDoc(userDocRef, {
          userId: firebaseUser.uid,
          name: firebaseUser.displayName || "",
          createdAt: serverTimestamp(),
        });
        useStore.getState().setProfile({ name: firebaseUser.displayName || "" });
      } else {
        const data = docSnap.data();
        const profile = {
          name: data?.name || firebaseUser.displayName || "",
          age: data?.age,
          weight: data?.weight,
          height: data?.height,
          gender: data?.gender,
          bodyFat: data?.bodyFat,
          primaryGoal: data?.primaryGoal,
          preferredStyle: data?.preferredStyle,
          activityLevel: data?.activityLevel,
        };
        useStore.getState().setProfile(profile);
        // Profile is "complete" if the user has entered their body metrics
        profileComplete = !!(data?.weight && data?.height);
      }

      // Hydrate the rest of the store (workout plan, nutrition, etc.)
      const userData = await fetchUserData(firebaseUser.uid);
      if (userData) hydrateStore(userData);

      return profileComplete;
    } catch (error) {
      console.error("[AuthProvider] Error loading user data:", error);
      return false;
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      setUser(firebaseUser);
      useStore.getState().checkAndResetDaily();

      if (firebaseUser) {
        const complete = await loadUserData(firebaseUser);
        setHasCompleteProfile(complete);
      } else {
        setHasCompleteProfile(false);
      }

      // Only set loading=false AFTER all async Firestore work is done
      setLoading(false);
    });

    return unsubscribe;
  }, [hydrateStore]);

  // Sign in and immediately return whether the user has a complete profile.
  // This removes the need for setTimeout in OnboardingScreen.
  const signInWithGoogle = async (): Promise<{ hasProfile: boolean }> => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      // onAuthStateChanged will fire next and call loadUserData,
      // but we also call it here so the caller can get an immediate answer.
      const complete = await loadUserData(result.user);
      setUser(result.user);
      setHasCompleteProfile(complete);
      return { hasProfile: complete };
    } catch (error: any) {
      if (error.code !== "auth/popup-closed-by-user") {
        console.error("[AuthProvider] Google sign-in error:", error);
      }
      return { hasProfile: false };
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      useStore.getState().resetStore();
      setHasCompleteProfile(false);
    } catch (error) {
      console.error("[AuthProvider] Sign out error:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, hasCompleteProfile, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
