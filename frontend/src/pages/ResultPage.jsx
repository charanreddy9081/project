import { useParams } from "react-router-dom";

export default function ResultPage() {
  const { predictionId } = useParams();
  
  return (
    <div className="p-8">
      <h1>Result Detail: {predictionId}</h1>
      <p>This page will show detailed results</p>
    </div>
  );
}
