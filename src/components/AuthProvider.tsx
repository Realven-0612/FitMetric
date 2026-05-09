import React, { createContext, useContext, useEffect, useState } from "react";
import { User, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut } from "firebase/auth";
import { auth, db } from "../lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { fetchUserData } from "../services/firebaseService";
import { useStore } from "../lib/store";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const hydrateStore = useStore(state => state.hydrateStore);
  const resetStore = useStore(state => state.resetStore);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      setUser(firebaseUser);
      useStore.getState().checkAndResetDaily();
      
      // If user logs in, ensure their document exists or setup defaults
      if (firebaseUser) {
        try {
          // Reset store về 0 trước khi load data user mới
          useStore.getState().resetStore();
          const userDocRef = doc(db, "users", firebaseUser.uid);
          const docSnap = await getDoc(userDocRef);
          
          if (!docSnap.exists()) {
            await setDoc(userDocRef, {
               userId: firebaseUser.uid,
               name: firebaseUser.displayName || "",
               createdAt: serverTimestamp()
            });
            useStore.getState().setProfile({
               name: firebaseUser.displayName || "",
            });
          } else {
             // Sync firestore user profile doc to zustand
             const data = docSnap.data();
             useStore.getState().setProfile({
               name: data?.name || firebaseUser.displayName || "",
               age: data?.age,
               weight: data?.weight,
               height: data?.height,
               gender: data?.gender,
               bodyFat: data?.bodyFat,
               primaryGoal: data?.primaryGoal,
               preferredStyle: data?.preferredStyle,
               activityLevel: data?.activityLevel,
             });
          }

          // Fetch the unified data from firestore and hydrate the zustand store
          const userData = await fetchUserData(firebaseUser.uid);
          if (userData) {
            hydrateStore(userData);
          }
        } catch (error) {
          console.error("Error setting up user profile in Firestore:", error);
        }
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, [hydrateStore]);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error signing in with Google:", error);
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      useStore.getState().resetStore();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
