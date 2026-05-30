import React, { useState, useRef } from "react";
import Webcam from "react-webcam";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Fingerprint, Camera, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { analyzeAIImage } from "../lib/ai";
import { useAuth } from "../components/AuthProvider";
import { db, storage } from "../lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";

export default function Scanner() {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [useWebcam, setUseWebcam] = useState(false);
  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  const capture = () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setImage(imageSrc);
      setUseWebcam(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async () => {
    if (!image) return;
    setLoading(true);
    setAnalysis(null);
    try {
      const base64Data = image.split(",")[1];
      const mimeType = image.split(";")[0].split(":")[1];

      const prompt = `You are a professional fitness coach and AI body analyst. 
      Analyze the person in this image. Provide a detailed assessment of their current physique.
      Be encouraging but objective. Score their fitness level strictly on a scale of 1 to 100.`;

      const schema = {
        type: "object",
        properties: {
          bodyFatEstimate: { type: "string" },
          physiqueType: { type: "string" },
          muscleMass: { type: "string" },
          strengths: { type: "array", items: { type: "string" } },
          weaknesses: { type: "array", items: { type: "string" } },
          recommendation: { type: "string" },
          score: { type: "number", description: "Fitness score strictly from 1 to 100." }
        },
        required: ["bodyFatEstimate", "physiqueType", "muscleMass", "strengths", "weaknesses", "recommendation", "score"]
      };

      const data = await analyzeAIImage(prompt, base64Data, mimeType, schema);
      setAnalysis(data);
      
      let imageUrl = image;
      
      console.log("[Scanner] user:", user?.uid ?? "NOT LOGGED IN");

      if (user) {
        try {
          console.log("[Scanner] Uploading to Firebase Storage. Bucket:", storage.app.options.storageBucket);
          const ext = mimeType.split('/')[1]?.split(';')[0] || 'jpg';
          const imageRef = ref(storage, `users/${user.uid}/scans/${Date.now()}.${ext}`);
          
          console.log("[Scanner] Target path:", imageRef.fullPath);
          await uploadString(imageRef, image, 'data_url');
          imageUrl = await getDownloadURL(imageRef);
          console.log("[Scanner] Storage upload OK, URL:", imageUrl);
          
          await addDoc(collection(db, "users", user.uid, "scans"), {
            userId: user.uid,
            date: new Date().toISOString(),
            image: imageUrl,
            isDeleted: false,
            ...data
          });
          console.log("[Scanner] Firestore doc saved OK");
          toast.success("Analysis complete & synced to cloud!");
        } catch (err: any) {
          console.error("[Scanner] Firebase save FAILED:", err?.code, err?.message);
          toast.warning(`Cloud sync failed: ${err?.message || 'unknown error'}`);
        }
      } else {
        console.warn("[Scanner] User not logged in – saving to localStorage only.");
        toast.success("Analysis complete! (Sign in to save to cloud)");
      }

      const history = JSON.parse(localStorage.getItem('scan_history') || '[]');
      history.unshift({ date: new Date().toISOString(), image: imageUrl, ...data });
      localStorage.setItem('scan_history', JSON.stringify(history));
    } catch (err) {
      console.error(err);
      toast.error("Failed to analyze image.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 w-full h-full lg:min-h-[calc(100vh-8rem)] flex flex-col pb-10">
      <style>{`
        @keyframes scan-laser {
          0% { top: 0%; opacity: 0.8; }
          50% { opacity: 1; }
          100% { top: 100%; opacity: 0.8; }
        }
        @keyframes grid-pulse {
          0%, 100% { opacity: 0.05; }
          50% { opacity: 0.2; }
        }
        .laser-line {
          position: absolute;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, transparent, #22d3ee, #a855f7, #22d3ee, transparent);
          box-shadow: 0 0 15px #22d3ee, 0 0 30px #a855f7;
          animation: scan-laser 3s infinite linear;
          z-index: 20;
        }
        .scan-grid {
          background-size: 24px 24px;
          background-image: 
            linear-gradient(to right, rgba(34, 211, 238, 0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(34, 211, 238, 0.05) 1px, transparent 1px);
          animation: grid-pulse 3s infinite ease-in-out;
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-card p-6 md:p-8 rounded-3xl border border-border shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-36 h-36 bg-cyan-500/10 rounded-full blur-[60px] pointer-events-none" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-cyan-500/20 blur-sm animate-ping scale-110" />
            <div className="relative w-14 h-14 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 shadow-sm">
              <Fingerprint className="w-7 h-7 text-cyan-500" />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-black text-foreground uppercase tracking-widest">Composition Scan</h1>
            <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">AI Biometric Analysis & Body fat estimate</p>
          </div>
        </div>
      </div>

      <Card className="bg-card border border-border overflow-hidden shadow-sm rounded-[2rem] flex-1 flex flex-col">
        <CardContent className="p-0 flex flex-col lg:flex-row h-full overflow-hidden">
          <div className="flex flex-col lg:flex-row w-full h-full">
             <div className={`p-6 md:p-8 flex-1 flex flex-col justify-center items-center ${analysis ? 'lg:border-r border-border lg:w-1/2' : 'w-full'} transition-all`}>
                {!image && !useWebcam && (
                  <div className="w-full max-w-lg aspect-square flex flex-col items-center justify-center border-2 border-dashed border-border rounded-[2rem] bg-muted/20 hover:bg-muted/40 hover:border-cyan-500/30 transition-all p-8 text-center gap-8 group cursor-pointer relative shadow-inner"
                       onClick={() => fileInputRef.current?.click()}>
                    <div className="relative">
                      <div className="absolute inset-0 bg-cyan-500/10 rounded-full blur-3xl scale-[2.0] group-hover:scale-[2.5] transition-transform duration-500"></div>
                      <div className="w-16 h-16 rounded-2xl bg-cyan-500/5 border border-cyan-500/10 flex items-center justify-center group-hover:border-cyan-500/30 transition-colors">
                        <UploadCloud className="w-8 h-8 text-cyan-500" />
                      </div>
                    </div>
                    <div>
                      <h3 className="font-black text-xl text-foreground mb-2 uppercase tracking-wide">Upload Physique Photo</h3>
                      <p className="text-xs text-muted-foreground font-medium">Drag & drop or click to browse image</p>
                    </div>
                    <div className="flex gap-3 relative z-10">
                      <Button onClick={(e) => { e.stopPropagation(); setUseWebcam(true); }} variant="outline" className="rounded-xl border-border bg-card text-xs font-black uppercase tracking-widest h-10 px-5 hover:bg-muted">CAMERA</Button>
                      <Button className="rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs uppercase tracking-widest h-10 px-5 transition-all shadow-sm">BROWSE</Button>
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload}/>
                    </div>
                  </div>
                )}
                {useWebcam && (
                  <div className="relative w-full max-w-lg aspect-[3/4] bg-black rounded-[2rem] overflow-hidden border border-border shadow-inner">
                    <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" className="w-full h-full object-cover" />
                    <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-4">
                      <Button onClick={capture} className="rounded-full w-14 h-14 bg-white text-black hover:scale-105 active:scale-95 transition-transform"><Camera className="w-5 h-5"/></Button>
                      <Button onClick={() => setUseWebcam(false)} variant="destructive" className="rounded-full w-14 h-14 hover:scale-105 active:scale-95 transition-transform">✕</Button>
                    </div>
                  </div>
                )}
                {image && (
                   <div className="w-full h-full max-w-md mx-auto flex flex-col justify-center gap-4">
                      <div className="relative rounded-[2rem] overflow-hidden border border-border aspect-[3/4] bg-black shadow-2xl">
                        <img src={image} alt="Physique" className="w-full h-full object-cover" />
                        
                        {/* Scan grid and laser effect */}
                        {loading && (
                          <>
                            <div className="absolute inset-0 scan-grid z-10" />
                            <div className="laser-line" />
                          </>
                        )}

                        {!loading && (
                          <button
                            onClick={() => { setImage(null); setAnalysis(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                            className="absolute top-4 right-4 w-9 h-9 rounded-xl bg-black/80 backdrop-blur-md border border-border flex items-center justify-center text-white hover:bg-red-500 hover:border-red-500/30 transition-all z-20"
                          >✕</button>
                        )}
                        {loading && (
                          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center p-8 gap-4 z-15">
                             <div className="w-16 h-16 rounded-full border border-cyan-500/20 bg-cyan-500/10 flex items-center justify-center shadow-sm animate-pulse">
                               <Fingerprint className="w-8 h-8 text-cyan-400"/>
                             </div>
                             <div className="text-cyan-400 font-mono text-xs tracking-widest font-black uppercase animate-pulse mt-2">ANALYZING PHYSIQUE...</div>
                          </div>
                        )}
                      </div>
                      {!loading && !analysis && (
                        <div className="flex gap-3">
                          <Button
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex-1 h-12 rounded-xl border-border bg-muted/40 text-muted-foreground hover:bg-muted text-xs font-black uppercase tracking-widest transition-all"
                          >
                            📷 Change Photo
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => { setImage(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                            className="flex-1 h-12 rounded-xl border-red-500/20 bg-red-500/5 text-red-500 hover:bg-red-500/10 text-xs font-black uppercase tracking-widest transition-all"
                          >
                            ✕ Cancel
                          </Button>
                        </div>
                      )}
                      {!loading && !analysis && <Button onClick={analyzeImage} className="w-full bg-cyan-500 hover:bg-cyan-400 text-black h-14 rounded-xl font-black uppercase text-xs tracking-widest shadow-sm transition-all">START BIOMETRIC SCAN</Button>}
                   </div>
                )}
             </div>
             {analysis && (
                <div className="flex-1 p-6 md:p-8 bg-muted/20 overflow-y-auto space-y-6 max-h-[85vh] custom-scrollbar">
                   <div className="flex items-center gap-3 border-b border-border pb-4">
                      <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-500">
                         <Fingerprint className="w-5 h-5 shadow-cyan"/>
                      </div>
                      <div>
                         <h2 className="text-xl font-black text-foreground uppercase tracking-wider">Scan Diagnostics</h2>
                         <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">{analysis.physiqueType}</p>
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <Card className="bg-card p-5 rounded-2xl border-border relative overflow-hidden shadow-inner">
                         <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-500/5 rounded-full blur-xl pointer-events-none" />
                         <p className="text-[8px] text-muted-foreground uppercase font-black tracking-widest mb-1">Body Fat Estimate</p>
                         <p className="text-3xl font-black text-cyan-500 tracking-tight">{String(analysis.bodyFatEstimate).replace('%', '')}%</p>
                         <div className="w-full bg-muted rounded-full h-1.5 mt-3 border border-border overflow-hidden">
                            <div className="bg-cyan-400 h-full rounded-full" style={{ width: `${Math.min(100, (parseFloat(analysis.bodyFatEstimate) || 15) * 2.5)}%` }} />
                         </div>
                      </Card>
                      <Card className="bg-card p-5 rounded-2xl border-border relative overflow-hidden shadow-inner">
                         <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/5 rounded-full blur-xl pointer-events-none" />
                         <p className="text-[8px] text-muted-foreground uppercase font-black tracking-widest mb-1">Fitness Score</p>
                         <p className="text-3xl font-black text-purple-500 tracking-tight">{analysis.score}/100</p>
                         <div className="w-full bg-muted rounded-full h-1.5 mt-3 border border-border overflow-hidden">
                            <div className="bg-purple-500 h-full rounded-full" style={{ width: `${analysis.score}%` }} />
                         </div>
                      </Card>
                   </div>

                   <div className="bg-card border border-border rounded-2xl p-5 shadow-inner">
                      <p className="text-[9px] text-cyan-500 uppercase font-black mb-3 tracking-widest">Aesthetic Strengths</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {Array.isArray(analysis.strengths) && analysis.strengths.map((str: string, i: number) => (
                          <div key={i} className="flex gap-2 items-center text-xs text-muted-foreground font-semibold bg-muted/20 border border-border p-2.5 rounded-xl">
                            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                            <span className="truncate">{str}</span>
                          </div>
                        ))}
                      </div>
                   </div>

                   <div className="bg-card border border-border rounded-2xl p-5 shadow-inner">
                      <p className="text-[9px] text-purple-500 uppercase font-black mb-3 tracking-widest">Areas to Target</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {Array.isArray(analysis.weaknesses) && analysis.weaknesses.map((weak: string, i: number) => (
                          <div key={i} className="flex gap-2 items-center text-xs text-muted-foreground font-semibold bg-muted/20 border border-border p-2.5 rounded-xl">
                            <div className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                            <span className="truncate">{weak}</span>
                          </div>
                        ))}
                      </div>
                   </div>

                   <div className="bg-cyan-500/5 p-5 rounded-2xl border border-cyan-500/20 shadow-inner">
                      <p className="text-[9px] text-cyan-500 uppercase font-black mb-1.5 tracking-widest">Coach Recommendation</p>
                      <p className="text-xs text-muted-foreground leading-relaxed font-semibold">{analysis.recommendation}</p>
                   </div>
                   
                   <Button onClick={() => {setImage(null); setAnalysis(null);}} className="w-full rounded-xl border border-border bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground h-12 font-black uppercase text-[10px] tracking-widest transition-all">NEW SCAN</Button>
                </div>
             )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
