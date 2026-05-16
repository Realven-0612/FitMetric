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
      
      if (user) {
        try {
          const imageRef = ref(storage, `users/${user.uid}/scans/${Date.now()}.${mimeType === 'jpeg' ? 'jpg' : mimeType}`);
          await uploadString(imageRef, base64Data, 'base64');
          imageUrl = await getDownloadURL(imageRef);
          
          await addDoc(collection(db, "users", user.uid, "scans"), {
            date: new Date().toISOString(),
            image: imageUrl,
            ...data
          });
        } catch (err) {
          console.error("Firebase upload failed:", err);
          toast.warning("Saved locally, but failed to sync to cloud.");
        }
      }

      const history = JSON.parse(localStorage.getItem('scan_history') || '[]');
      history.unshift({ date: new Date().toISOString(), image: imageUrl, ...data });
      localStorage.setItem('scan_history', JSON.stringify(history));
      toast.success("Analysis complete!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to analyze image.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 w-full h-full lg:min-h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5 w-fit self-center lg:self-start">
        <div className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest bg-cyan-500 text-black shadow-[0_0_20px_rgba(34,211,238,0.3)]">
          <Fingerprint className="w-4 h-4" /> Composition Scan
        </div>
      </div>

      <Card className="bg-white/5 backdrop-blur-md border border-white/10 overflow-hidden shadow-none rounded-[2rem] flex-1 flex flex-col">
        <CardContent className="p-0 flex flex-col lg:flex-row h-full overflow-hidden">
          <div className="flex flex-col lg:flex-row w-full h-full">
             <div className={`p-6 flex-1 flex flex-col justify-center items-center ${analysis ? 'lg:border-r border-white/10 lg:w-1/2' : 'w-full'} transition-all`}>
                {!image && !useWebcam && (
                  <div className="w-full max-w-lg aspect-square flex flex-col items-center justify-center border-2 border-dashed border-white/20 rounded-[2rem] bg-slate-900/40 hover:bg-slate-900/60 hover:border-primary/50 transition-all p-8 text-center gap-8 group cursor-pointer relative"
                       onClick={() => fileInputRef.current?.click()}>
                    <div className="relative">
                      <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl scale-[2.0] group-hover:scale-[2.5] transition-transform duration-500"></div>
                      <UploadCloud className="w-10 h-10 text-primary relative z-10" />
                    </div>
                    <div>
                      <h3 className="font-black text-2xl text-white mb-2 uppercase">Upload Physique</h3>
                      <p className="text-sm text-slate-400">Drag & drop or click to browse</p>
                    </div>
                    <div className="flex gap-4">
                      <Button onClick={(e) => { e.stopPropagation(); setUseWebcam(true); }} variant="outline" className="rounded-2xl border-white/10 bg-black/50">CAMERA</Button>
                      <Button className="rounded-2xl bg-cyan-400 text-black font-black">BROWSE</Button>
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload}/>
                    </div>
                  </div>
                )}
                {useWebcam && (
                  <div className="relative w-full max-w-lg aspect-[3/4] bg-slate-900 rounded-[2rem] overflow-hidden border border-white/10">
                    <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" className="w-full h-full object-cover" />
                    <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-4">
                      <Button onClick={capture} className="rounded-full w-14 h-14 bg-white text-black"><Camera className="w-5 h-5"/></Button>
                      <Button onClick={() => setUseWebcam(false)} variant="destructive" className="rounded-full w-14 h-14">X</Button>
                    </div>
                  </div>
                )}
                {image && (
                   <div className="w-full h-full max-w-md mx-auto flex flex-col justify-center gap-4">
                      <div className="relative rounded-[2rem] overflow-hidden border border-white/10 aspect-[3/4]">
                        <img src={image} alt="Physique" className="w-full h-full object-cover" />
                        {!loading && (
                          <button
                            onClick={() => { setImage(null); setAnalysis(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/70 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-red-500/80 transition-all z-10"
                          >✕</button>
                        )}
                        {loading && (
                          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-8 gap-6">
                             <Fingerprint className="w-20 h-20 text-primary animate-pulse"/>
                             <div className="text-primary font-mono text-sm tracking-widest font-bold">ANALYZING...</div>
                          </div>
                        )}
                      </div>
                      {!loading && !analysis && (
                        <div className="flex gap-3">
                          <Button
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex-1 h-12 rounded-2xl border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                          >
                            📷 Change Photo
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => { setImage(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                            className="flex-1 h-12 rounded-2xl border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                          >
                            ✕ Cancel
                          </Button>
                        </div>
                      )}
                      {!loading && !analysis && <Button onClick={analyzeImage} className="w-full bg-cyan-500 h-14 rounded-2xl font-black">START SCAN</Button>}
                   </div>
                )}
             </div>
             {analysis && (
               <div className="flex-1 p-8 bg-slate-900/30 overflow-y-auto space-y-8">
                  <div className="flex items-center gap-3">
                     <Fingerprint className="w-8 h-8 text-primary shadow-primary"/>
                     <h2 className="text-2xl font-black text-white uppercase">Scan Report</h2>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <Card className="bg-white/5 p-4 rounded-2xl border-white/10">
                        <p className="text-[10px] text-slate-500 uppercase font-black">Body Fat</p>
                        <p className="text-3xl font-black text-primary">{String(analysis.bodyFatEstimate).replace('%', '')}%</p>
                     </Card>
                     <Card className="bg-white/5 p-4 rounded-2xl border-white/10">
                        <p className="text-[10px] text-slate-500 uppercase font-black">Fitness Score</p>
                        <p className="text-3xl font-black text-white">{analysis.score}/100</p>
                     </Card>
                  </div>
                  <div className="bg-secondary/10 p-6 rounded-2xl border border-secondary/30">
                     <p className="text-[10px] text-secondary uppercase font-black mb-2 tracking-widest">Recommendation</p>
                     <p className="text-sm text-slate-300 leading-relaxed">{analysis.recommendation}</p>
                  </div>
                  <Button onClick={() => {setImage(null); setAnalysis(null);}} className="w-full rounded-2xl border-white/10 bg-white/5 text-slate-400 h-12">NEW SCAN</Button>
               </div>
             )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
