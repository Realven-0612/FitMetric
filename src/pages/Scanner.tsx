import React, { useState, useRef } from "react";
import { GoogleGenAI } from "@google/genai";
import Webcam from "react-webcam";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Fingerprint, Camera, UploadCloud, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

export default function Scanner() {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [useWebcam, setUseWebcam] = useState(false);
  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const base64Data = image.split(",")[1];
      const mimeType = image.split(";")[0].split(":")[1];

      const prompt = `You are a professional fitness coach and AI body analyst. 
      Analyze the person in this image. Provide a detailed assessment of their current physique.
      Return the result strictly as a JSON object with this shape:
      {
        "bodyFatEstimate": "number (e.g. 15.5)",
        "physiqueType": "Short description of body type",
        "muscleMass": "Low / Average / High",
        "strengths": ["list of observed strong points"],
        "weaknesses": ["list of areas to improve"],
        "recommendation": "A professional actionable advice for their training",
        "score": number between 1 to 100 representing overall fitness aesthetics
      }`;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: [
          { inlineData: { data: base64Data, mimeType } },
          prompt
        ],
        config: {
          responseMimeType: "application/json"
        }
      });

      const data = JSON.parse(response.text.trim());
      setAnalysis(data);
      toast.success("Analysis complete!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to analyze image. Ensure API key is set.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 w-full h-full lg:h-[calc(100vh-8rem)]">
      <Card className="bg-white/5 backdrop-blur-md border border-white/10 overflow-hidden shadow-none rounded-3xl h-full flex flex-col">
        <CardContent className="p-0 flex flex-col lg:flex-row h-full">
          {/* Left panel - Image loading or input area */}
          <div className={`p-6 flex-1 flex flex-col justify-center items-center ${analysis ? 'lg:border-r border-white/10 lg:w-1/2' : 'w-full'} transition-all`}>
            {!image && !useWebcam && (
              <div className="w-full max-w-lg aspect-square flex flex-col items-center justify-center border-2 border-dashed border-white/20 rounded-[2rem] bg-slate-900/40 hover:bg-slate-900/60 transition-colors p-8 text-center gap-6 group">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl scale-150 group-hover:scale-110 transition-transform"></div>
                  <Fingerprint className="w-20 h-20 text-primary relative z-10" />
                </div>
                <h3 className="font-bold text-xl text-white">Initialize AI Body Scanner</h3>
                <p className="text-sm text-slate-400 max-w-[250px]">Upload a photo or use your camera to start a full body composition analysis.</p>
                <div className="flex gap-4 mt-2">
                  <Button onClick={() => setUseWebcam(true)} variant="outline" className="rounded-2xl border-white/10 bg-white/5 hover:bg-white/10">
                    <Camera className="w-4 h-4 mr-2"/> Camera
                  </Button>
                  <Button onClick={() => fileInputRef.current?.click()} className="rounded-2xl bg-primary text-black hover:bg-primary/90 font-bold shadow-lg shadow-primary/20">
                    <UploadCloud className="w-4 h-4 mr-2"/> Upload
                  </Button>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload}/>
                </div>
              </div>
            )}

            {useWebcam && (
              <div className="relative w-full max-w-lg aspect-[3/4] bg-slate-900 rounded-[2rem] overflow-hidden border border-white/10">
                <Webcam
                  {...({ audio: false, ref: webcamRef, screenshotFormat: "image/jpeg", className: "w-full h-full object-cover" } as any)}
                />
                <div className="absolute bottom-6 left-0 right-0 flex justify-center items-center">
                   <div className="p-2 backdrop-blur-md bg-black/40 rounded-full flex gap-4 border border-white/10">
                      <Button onClick={capture} className="rounded-full w-14 h-14 bg-white text-black hover:bg-gray-200">
                        <Camera className="w-5 h-5"/>
                      </Button>
                      <Button onClick={() => setUseWebcam(false)} variant="destructive" size="icon" className="rounded-full w-14 h-14">
                        X
                      </Button>
                   </div>
                </div>
              </div>
            )}

            {image && (
               <div className="w-full h-full max-w-md mx-auto flex flex-col justify-center gap-4 relative">
                  <div className="relative rounded-[2rem] overflow-hidden border border-white/10 bg-slate-900 group aspect-[3/4]">
                    <img src={image} alt="Scanned body" className="w-full h-full object-cover" />
                    
                    {loading && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-8 flex-col gap-6">
                         <div className="relative">
                            <Fingerprint className="w-20 h-20 text-primary animate-pulse relative z-10"/>
                            <div className="absolute inset-0 bg-primary rounded-full blur-2xl animate-pulse opacity-50"></div>
                         </div>
                         <div className="text-primary font-mono text-sm tracking-[0.2em] font-bold">ANALYZING PHYSIQUE...</div>
                         <Progress value={undefined} className="w-48 h-1 bg-white/10 [&>div]:bg-primary"/>
                      </div>
                    )}

                    {!loading && !analysis && (
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-6">
                            <Button onClick={() => setImage(null)} variant="destructive" className="w-full rounded-2xl font-bold bg-red-500/80 backdrop-blur-md border border-red-500/50 hover:bg-red-500">RETAKE PHOTO</Button>
                        </div>
                    )}
                  </div>
                  
                  {!loading && !analysis && (
                      <Button onClick={analyzeImage} size="lg" className="w-full bg-cyan-500 hover:bg-cyan-400 text-white font-bold rounded-2xl transition-all shadow-lg shadow-cyan-500/30">
                          EXECUTE FULL SCAN
                      </Button>
                  )}
               </div>
            )}
          </div>

          {/* Right panel - Results (hidden until analysis is done) */}
          {analysis && (
            <div className="flex-1 p-6 lg:p-8 bg-slate-900/30 overflow-y-auto space-y-8 animate-in fade-in slide-in-from-right-8 duration-700">
               
               <div className="flex items-center gap-3">
                  <div className="p-3 bg-primary/20 rounded-xl border border-primary/30 text-primary shadow-[0_0_15px_rgba(34,211,238,0.3)]">
                      <Fingerprint className="w-6 h-6"/>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Scan Complete</h2>
                    <p className="text-sm text-slate-400">AI Body Composition Report generated</p>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 shadow-none">
                      <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Body Fat Est.</div>
                      <div className="text-3xl font-black text-primary">{analysis.bodyFatEstimate}<span className="text-lg opacity-60 font-medium">%</span></div>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 shadow-none">
                      <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Aesthetics</div>
                      <div className="text-3xl font-black text-white">{analysis.score}<span className="text-lg opacity-60 font-medium">/100</span></div>
                  </div>
                  <div className="col-span-2 p-4 rounded-2xl bg-white/5 border border-white/10 shadow-none flex justify-between items-center">
                     <div>
                       <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Class</div>
                       <div className="text-lg font-bold text-white leading-tight">{analysis.physiqueType}</div>
                     </div>
                     <div className="text-right">
                       <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Muscle Mass</div>
                       <div className="text-lg font-bold text-secondary">{analysis.muscleMass}</div>
                     </div>
                  </div>
               </div>

               <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-5 bg-white/5 rounded-2xl border border-white/5">
                     <h4 className="text-xs uppercase font-bold text-emerald-400 mb-3 tracking-wider flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Strengths
                     </h4>
                     <ul className="space-y-3">
                        {analysis.strengths.map((s: string, i: number) => (
                           <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                              <span className="text-emerald-400 opacity-60 font-black">✓</span>
                              <span className="leading-snug">{s}</span>
                           </li>
                        ))}
                     </ul>
                  </div>
                  <div className="p-5 bg-white/5 rounded-2xl border border-white/5">
                     <h4 className="text-xs uppercase font-bold text-orange-400 mb-3 tracking-wider flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span> Focus Areas
                     </h4>
                     <ul className="space-y-3">
                        {analysis.weaknesses.map((s: string, i: number) => (
                           <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                              <span className="text-orange-400 opacity-60 font-black">!</span>
                              <span className="leading-snug">{s}</span>
                           </li>
                        ))}
                     </ul>
                  </div>
               </div>

               <div className="p-6 rounded-2xl bg-secondary/10 border border-secondary/30 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/20 blur-3xl rounded-full translate-x-10 -translate-y-10 pointer-events-none"></div>
                  <h4 className="text-xs uppercase tracking-widest text-secondary font-bold mb-3">AI Coach Protocol Recommendation</h4>
                  <p className="text-slate-200 text-sm leading-relaxed relative z-10">
                     {analysis.recommendation}
                  </p>
               </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
