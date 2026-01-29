import { useState, useEffect, useRef } from "react";
import { Send, Image as ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => `session_${Date.now()}`);
  const [selectedImage, setSelectedImage] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Load chat history
    const loadHistory = async () => {
      try {
        const response = await axios.get(`${API}/chat/history/${sessionId}`);
        setMessages(response.data);
      } catch (error) {
        console.error("Error loading chat history:", error);
      }
    };
    loadHistory();
  }, [sessionId]);

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

  const sendMessage = async () => {
    if (!inputMessage.trim() && !selectedImage) return;

    const userMessage = {
      role: "user",
      message: inputMessage,
      image_base64: selectedImage,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    const imageToSend = selectedImage;
    setSelectedImage(null);
    setIsLoading(true);

    try {
      const base64Data = imageToSend ? imageToSend.split(',')[1] : null;
      
      const response = await axios.post(`${API}/chat`, {
        session_id: sessionId,
        message: inputMessage || "Please analyze this image",
        image_base64: base64Data
      });

      const aiMessage = {
        role: "assistant",
        message: response.data.response,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="h-screen flex flex-col" data-testid="chat-page">
      {/* Header */}
      <div className="bg-white border-b border-border p-4 shadow-sm">
        <h1 className="text-2xl font-bold text-foreground text-center">Plant Care Assistant</h1>
        <p className="text-sm text-muted-foreground text-center">Ask me anything about plant care</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ paddingBottom: '8rem' }}>
        {messages.length === 0 ? (
          <div className="text-center mt-12">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <ImageIcon className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Start a Conversation</h3>
            <p className="text-sm text-muted-foreground">
              Ask about plant diseases, care tips, or upload an image
            </p>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div
              key={index}
              data-testid={`chat-message-${msg.role}`}
              className={`flex chat-bubble ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-2xl p-4 ${
                  msg.role === "user"
                    ? "bg-primary text-white"
                    : "bg-card border border-border"
                }`}
              >
                {msg.image_base64 && (
                  <img
                    src={`data:image/jpeg;base64,${msg.image_base64}`}
                    alt="Uploaded"
                    className="w-full rounded-lg mb-2 max-h-48 object-cover"
                  />
                )}
                <p className="text-base leading-relaxed whitespace-pre-wrap">{msg.message}</p>
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start chat-bubble">
            <div className="bg-card border border-border rounded-2xl p-4">
              <Loader2 className="w-5 h-5 spinner text-primary" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="fixed bottom-20 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-border p-4">
        <div className="max-w-2xl mx-auto">
          {selectedImage && (
            <div className="mb-2 relative inline-block">
              <img
                src={selectedImage}
                alt="Selected"
                className="w-20 h-20 rounded-lg object-cover"
              />
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-white rounded-full text-xs font-bold"
              >
                ×
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            <Button
              data-testid="upload-image-button"
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-full w-12 h-12 flex-shrink-0"
            >
              <ImageIcon className="w-5 h-5" />
            </Button>
            <input
              data-testid="chat-input"
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about plant care..."
              className="flex-1 px-4 py-3 rounded-full border-2 border-input bg-background focus:border-primary outline-none transition-colors"
            />
            <Button
              data-testid="send-button"
              onClick={sendMessage}
              disabled={(!inputMessage.trim() && !selectedImage) || isLoading}
              className="rounded-full w-12 h-12 flex-shrink-0 bg-primary hover:bg-primary/90 text-white"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
