import React, { useState, useRef } from "react";
import Webcam from "react-webcam";
import { Button } from "@/components/ui/button";
import { Camera, UploadCloud, Loader2, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

interface MealScannerProps {
  onFoodDetected: (food: { name: string; kcal: number; protein: number; carbs: number; fat: number }) => void;
  onClose: () => void;
}

export function MealScanner({ onFoodDetected, onClose }: MealScannerProps) {
  const [image, setImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
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

  const scanMeal = async () => {
    if (!image) return;
    setIsScanning(true);
    try {
      const base64Data = image.split(",")[1];
      const mimeType = image.split(";")[0].split(":")[1];

      const prompt = `
        Analyze this food image. Estimate the nutrition facts for the entire portion shown.
        Return a JSON object with:
        - name: A descriptive name of the dish.
        - kcal: Total calories (number).
        - protein: Total protein in grams (number).
        - carbs: Total carbohydrates in grams (number).
        - fat: Total fat in grams (number).
        - confidence: 1-100 score of your estimation.
      `;

      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "gemini-1.5-flash",
          contents: [{ 
            role: "user",
            parts: [
              { inlineData: { data: base64Data, mimeType } },
              { text: prompt }
            ]
          }],
          config: { 
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                name: { type: "STRING" },
                kcal: { type: "NUMBER" },
                protein: { type: "NUMBER" },
                carbs: { type: "NUMBER" },
                fat: { type: "NUMBER" },
                confidence: { type: "NUMBER" }
              },
              required: ["name", "kcal", "protein", "carbs", "fat"]
            }
          }
        })
      });

      if (!response.ok) throw new Error('AI request failed');
      const resultData = await response.json();

      const result = JSON.parse(resultData.text.trim());
      onFoodDetected(result);
      toast.success(`Logged ${result.name}! (AI Confidence: ${result.confidence}%)`);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Failed to scan meal.");
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in transition-all duration-300">
      <div className="bg-[#111] border border-white/10 rounded-[2.5rem] w-full max-w-lg overflow-hidden flex flex-col relative shadow-2xl">
        <Button 
          variant="ghost" 
          onClick={onClose} 
          className="absolute top-6 right-6 z-20 w-10 h-10 rounded-full bg-black/40 hover:bg-white/10 text-white p-0"
        >
          <X className="w-5 h-5" />
        </Button>

        <div className="p-8 pb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-cyan-500/20 rounded-xl">
              <Sparkles className="w-5 h-5 text-cyan-400" />
            </div>
            <h2 className="text-xl font-black text-white uppercase tracking-tighter italic">AI Vision Log</h2>
          </div>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
            Snap a photo for instant macro estimation
          </p>
        </div>

        <div className="flex-1 p-6 flex flex-col items-center justify-center min-h-[350px]">
          {!image && !useWebcam ? (
            <div 
              className="w-full aspect-[4/5] border-2 border-dashed border-white/10 rounded-[2rem] bg-white/5 flex flex-col items-center justify-center gap-6 group cursor-pointer hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="relative">
                <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-2xl scale-150"></div>
                <UploadCloud className="w-12 h-12 text-cyan-400 relative z-10 animate-bounce" />
              </div>
              <div className="text-center">
                <p className="text-sm font-black text-white uppercase">Upload Food Photo</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">or drag & drop</p>
              </div>
              <Button 
                onClick={(e) => { e.stopPropagation(); setUseWebcam(true); }}
                className="bg-white text-black font-black text-[10px] uppercase tracking-widest px-6 h-10 rounded-xl"
              >
                Use Camera
              </Button>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
            </div>
          ) : useWebcam ? (
            <div className="relative w-full aspect-[4/5] bg-black rounded-[2rem] overflow-hidden border border-white/10">
              <Webcam 
                ref={webcamRef} 
                audio={false} 
                screenshotFormat="image/jpeg" 
                className="w-full h-full object-cover" 
              />
              <div className="absolute bottom-6 left-0 right-0 flex justify-center scale-125">
                <button 
                  onClick={capture} 
                  className="w-16 h-16 rounded-full border-4 border-white bg-white/20 backdrop-blur-md flex items-center justify-center group"
                >
                  <div className="w-12 h-12 rounded-full bg-white group-active:scale-95 transition-transform"></div>
                </button>
              </div>
            </div>
          ) : (
            <div className="relative w-full aspect-[4/5] rounded-[2rem] overflow-hidden border border-white/10 group">
              <img src={image} className="w-full h-full object-cover" alt="Food scan" />
              {isScanning && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
                  <div className="relative">
                    <Loader2 className="w-16 h-16 text-cyan-400 animate-spin" />
                    <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-cyan-400 animate-pulse" />
                  </div>
                  <p className="text-xs font-black text-white uppercase tracking-widest animate-pulse">Analyzing Macros...</p>
                </div>
              )}
              {!isScanning && (
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                  <Button onClick={() => setImage(null)} variant="destructive" className="rounded-xl">Retake</Button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-8 pt-0">
          <Button 
            onClick={scanMeal} 
            disabled={!image || isScanning}
            className="w-full h-14 bg-cyan-500 hover:bg-cyan-400 text-black font-black uppercase tracking-widest text-xs rounded-2xl shadow-[0_0_30px_rgba(34,211,238,0.3)] disabled:opacity-50"
          >
            {isScanning ? "Processing..." : "Log this Meal"}
          </Button>
        </div>
      </div>
    </div>
  );
}
