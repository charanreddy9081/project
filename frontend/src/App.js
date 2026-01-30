import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import HomePage from "@/pages/HomePage";
import ChatPage from "@/pages/ChatPage";
import HistoryPage from "@/pages/HistoryPage";
import ResultPage from "@/pages/ResultPage";
import Layout from "@/components/Layout";

function App() {
  return (
    <div className="App">
      <BrowserRouter basename="/project">
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="chat" element={<ChatPage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="result/:predictionId" element={<ResultPage />} />
          </Route>
        </Routes>
      </BrowserRouter>

      <Toaster position="top-center" richColors />
    </div>
  );
}

export default App;
