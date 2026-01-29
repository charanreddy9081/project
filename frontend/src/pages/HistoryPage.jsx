import { useState, useEffect } from "react";
import { Calendar, CheckCircle2, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function HistoryPage() {
  const [predictions, setPredictions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const response = await axios.get(`${API}/predictions`);
      setPredictions(response.data);
    } catch (error) {
      console.error("Error loading history:", error);
      toast.error("Failed to load history");
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="min-h-screen p-4 md:p-8" data-testid="history-page">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8 fade-in">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight mb-3">
            Scan History
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed">
            Your recent disease predictions
          </p>
        </div>

        {/* History List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full spinner mx-auto"></div>
            <p className="text-muted-foreground mt-4">Loading history...</p>
          </div>
        ) : predictions.length === 0 ? (
          <Card className="p-12 text-center rounded-2xl">
            <Calendar className="w-16 h-16 text-muted mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Scans Yet</h3>
            <p className="text-muted-foreground">
              Your disease prediction history will appear here
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {predictions.map((prediction) => (
              <Card
                key={prediction.id}
                data-testid="history-item"
                className="p-6 rounded-2xl card-hover cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3">
                    {prediction.disease_name.toLowerCase().includes('healthy') ? (
                      <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                    ) : (
                      <AlertTriangle className="w-6 h-6 text-secondary flex-shrink-0 mt-1" />
                    )}
                    <div>
                      <h3 className="text-xl font-bold text-foreground mb-1">
                        {prediction.disease_name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(prediction.timestamp)}
                      </p>
                    </div>
                  </div>
                  <div className="px-3 py-1 rounded-full bg-secondary/20 text-secondary font-semibold text-sm">
                    {prediction.confidence}%
                  </div>
                </div>
                <p className="text-base text-foreground leading-relaxed line-clamp-2">
                  {prediction.description}
                </p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
