import { useState, useRef } from "react";
import { Camera, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function HomePage() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error("Please select a valid image file");
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async () => {
    if (!selectedImage) {
      toast.error("Please select an image first");
      return;
    }

    setIsLoading(true);
    try {
      // Extract base64 data (remove data:image/...;base64, prefix)
      const base64Data = selectedImage.split(',')[1];
      
      const response = await axios.post(`${API}/predict`, {
        image_base64: base64Data
      });

      setPrediction(response.data);
      toast.success("Analysis complete!");
    } catch (error) {
      console.error("Error analyzing image:", error);
      toast.error(error.response?.data?.detail || "Failed to analyze image");
    } finally {
      setIsLoading(false);
    }
  };

  const resetAnalysis = () => {
    setSelectedImage(null);
    setPrediction(null);
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 fade-in">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight mb-3">
            LeafHealth
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed">
            AI-powered plant disease detection for Indian farmers
          </p>
        </div>

        {!prediction ? (
          <>
            {/* Upload Area */}
            <Card 
              data-testid="upload-area"
              className="p-8 mb-6 border-2 border-dashed upload-area cursor-pointer rounded-2xl"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="flex flex-col items-center gap-4 text-center">
                {selectedImage ? (
                  <div className="w-full">
                    <img
                      src={selectedImage}
                      alt="Selected plant"
                      className="w-full h-64 object-cover rounded-xl mb-4"
                    />
                    <p className="text-sm text-muted-foreground">Click to change image</p>
                  </div>
                ) : (
                  <>
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                      <Camera className="w-10 h-10 text-primary" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold mb-1">Upload Plant Leaf Image</p>
                      <p className="text-sm text-muted-foreground">
                        Take a clear photo of the affected leaf
                      </p>
                    </div>
                    <Upload className="w-6 h-6 text-muted-foreground" />
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
                data-testid="file-input"
              />
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-4">
              {selectedImage && (
                <Button
                  data-testid="reset-button"
                  variant="outline"
                  onClick={resetAnalysis}
                  className="flex-1 rounded-full py-6 text-base"
                >
                  Reset
                </Button>
              )}
              <Button
                data-testid="analyze-button"
                onClick={analyzeImage}
                disabled={!selectedImage || isLoading}
                className="flex-1 rounded-full py-6 text-base bg-primary hover:bg-primary/90 text-white font-semibold shadow-lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 spinner" />
                    Analyzing...
                  </>
                ) : (
                  "Analyze Disease"
                )}
              </Button>
            </div>
          </>
        ) : (
          /* Results Display */
          <div className="fade-in" data-testid="results-section">
            {/* Disease Card */}
            <Card className="p-6 mb-6 rounded-2xl border-2">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    {prediction.disease_name}
                  </h2>
                  <div className="flex items-center gap-2">
                    <div className="px-3 py-1 rounded-full bg-secondary/20 text-secondary font-semibold text-sm">
                      {prediction.confidence}% Confidence
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-base text-foreground leading-relaxed">
                {prediction.description}
              </p>
            </Card>

            {/* Treatments */}
            <Card className="p-6 mb-6 rounded-2xl">
              <h3 className="text-xl font-bold text-foreground mb-4">Treatment Steps</h3>
              <ul className="space-y-3">
                {prediction.treatments.map((treatment, index) => (
                  <li key={index} className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-sm font-semibold">
                      {index + 1}
                    </span>
                    <span className="text-base text-foreground leading-relaxed">{treatment}</span>
                  </li>
                ))}
              </ul>
            </Card>

            {/* Prevention Tips */}
            <Card className="p-6 mb-6 rounded-2xl">
              <h3 className="text-xl font-bold text-foreground mb-4">Prevention Tips</h3>
              <ul className="space-y-3">
                {prediction.prevention_tips.map((tip, index) => (
                  <li key={index} className="flex gap-3">
                    <span className="text-primary text-xl">•</span>
                    <span className="text-base text-foreground leading-relaxed">{tip}</span>
                  </li>
                ))}
              </ul>
            </Card>

            {/* Actions */}
            <Button
              data-testid="scan-another-button"
              onClick={resetAnalysis}
              className="w-full rounded-full py-6 text-base bg-primary hover:bg-primary/90 text-white font-semibold"
            >
              Scan Another Leaf
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
