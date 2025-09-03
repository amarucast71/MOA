import { useState } from 'react';
import { MapComponent } from './components/MapComponent';
import { Sidebar } from './components/Sidebar';
import { ResultsModal } from './components/ResultsModal';
import { Button } from './components/ui/button';
import { BarChart3 } from 'lucide-react';

interface DataPoint {
  id: string;
  lat: number;
  lng: number;
  name: string;
  value: number;
  moValue?: number;
}

interface Polygon {
  id: string;
  coordinates: [number, number][];
  name: string;
}

export default function App() {
  const [dataPoints, setDataPoints] = useState<DataPoint[]>([]);
  const [polygons, setPolygons] = useState<Polygon[]>([]);
  const [isResultsModalOpen, setIsResultsModalOpen] = useState(false);
  const [excelData, setExcelData] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleExcelDataLoad = (data: any[]) => {
    setExcelData(data);
    // Convert Excel data to map points if it has lat/lng columns
    const points = data.map((row, index) => ({
      id: `point-${index}`,
      lat: row.latitud || row.lat || row.latitude || 0,
      lng: row.longitud || row.lng || row.longitude || 0,
      name: row.nombre || row.name || `Punto ${index + 1}`,
      value: row.valor || row.value || Math.random() * 100
    })).filter(point => point.lat !== 0 && point.lng !== 0);
    
    setDataPoints(points);
  };

  const handleAddPolygon = (polygon: Polygon) => {
    setPolygons(prev => [...prev, polygon]);
  };

  const handleAddPoint = (point: DataPoint) => {
    setDataPoints(prev => [...prev, point]);
  };

  const handleProcess = async () => {
    setIsProcessing(true);
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsProcessing(false);
    setIsResultsModalOpen(true);
  };

  return (
    <div className="h-screen flex bg-background">
      {/* Sidebar */}
      <div className="w-80 border-r border-border bg-card">
        <Sidebar 
          onExcelDataLoad={handleExcelDataLoad}
          dataPoints={dataPoints}
          polygons={polygons}
        />
        
        {/* Process Button */}
        <div className="absolute bottom-4 left-4">
          <Button 
            onClick={handleProcess}
            disabled={isProcessing || (dataPoints.length === 0 && polygons.length === 0)}
            className="flex items-center gap-2"
            size="lg"
          >
            <BarChart3 className="w-5 h-5" />
            {isProcessing ? 'Procesando...' : 'Procesar Datos'}
          </Button>
        </div>
      </div>

      {/* Main Map Area */}
      <div className="flex-1 relative">
        <MapComponent
          dataPoints={dataPoints}
          polygons={polygons}
          onAddPolygon={handleAddPolygon}
          onAddPoint={handleAddPoint}
        />
      </div>

      {/* Results Modal */}
      <ResultsModal
        isOpen={isResultsModalOpen}
        onClose={() => setIsResultsModalOpen(false)}
        dataPoints={dataPoints}
        polygons={polygons}
        excelData={excelData}
      />
    </div>
  );
}