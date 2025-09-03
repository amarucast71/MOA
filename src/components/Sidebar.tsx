import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Upload, FileSpreadsheet, MapPin, Shapes, Trash2 } from 'lucide-react';

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

interface SidebarProps {
  onExcelDataLoad: (data: any[]) => void;
  dataPoints: DataPoint[];
  polygons: Polygon[];
}

export function Sidebar({ onExcelDataLoad, dataPoints, polygons }: SidebarProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadedFileName(file.name);

    try {
      // Simulate Excel file parsing
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock Excel data - in a real app, you'd use a library like xlsx
      const mockData = [
        { nombre: 'Punto A', latitud: 40.7128, longitud: -74.0060, valor: 85.5 },
        { nombre: 'Punto B', latitud: 40.7589, longitud: -73.9851, valor: 92.3 },
        { nombre: 'Punto C', latitud: 40.7282, longitud: -73.7949, valor: 78.1 },
        { nombre: 'Punto D', latitud: 40.6782, longitud: -73.9442, valor: 91.7 },
        { nombre: 'Punto E', latitud: 40.7505, longitud: -73.9934, valor: 88.9 },
        { nombre: 'Punto F', latitud: 40.7061, longitud: -74.0088, valor: 76.4 },
        { nombre: 'Punto G', latitud: 40.7614, longitud: -73.9776, valor: 94.2 },
        { nombre: 'Punto H', latitud: 40.7420, longitud: -74.0020, valor: 82.6 }
      ];

      onExcelDataLoad(mockData);
    } catch (error) {
      console.error('Error al procesar el archivo:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="p-4 space-y-4 h-full overflow-y-auto">
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Panel de Control</h1>
        
        {/* File Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              Cargar Datos Excel
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Archivo de datos</Label>
              <div className="space-y-2">
                <Button 
                  onClick={triggerFileUpload}
                  disabled={isUploading}
                  className="w-full"
                  variant="outline"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {isUploading ? 'Cargando...' : 'Seleccionar Archivo Excel'}
                </Button>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                
                {uploadedFileName && (
                  <div className="text-sm text-muted-foreground">
                    Archivo cargado: {uploadedFileName}
                  </div>
                )}
              </div>
            </div>
            
            <div className="text-xs text-muted-foreground">
              <p>Formatos soportados: .xlsx, .xls, .csv</p>
              <p>Columnas esperadas: nombre, latitud, longitud, valor/MO</p>
              <p>También puedes agregar puntos manualmente en el mapa</p>
            </div>
          </CardContent>
        </Card>

        {/* Data Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Resumen de Datos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{dataPoints.length}</div>
                <div className="text-sm text-muted-foreground">Puntos de Datos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{polygons.length}</div>
                <div className="text-sm text-muted-foreground">Polígonos</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Points List */}
        {dataPoints.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Puntos Cargados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {dataPoints.map(point => (
                  <div key={point.id} className="flex items-center justify-between p-2 bg-muted rounded">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{point.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {point.lat.toFixed(4)}, {point.lng.toFixed(4)}
                      </div>
                    </div>
                    <Badge variant="secondary">
                      MO: {(point.moValue || point.value).toFixed(1)}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Polygons List */}
        {polygons.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shapes className="w-5 h-5" />
                Polígonos Dibujados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {polygons.map(polygon => (
                  <div key={polygon.id} className="flex items-center justify-between p-2 bg-muted rounded">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{polygon.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {polygon.coordinates.length} puntos
                      </div>
                    </div>
                    <Badge variant="outline">
                      Polígono
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Instrucciones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>1. Carga un archivo Excel con tus datos</p>
            <p>2. O agrega puntos manualmente en el mapa satelital</p>
            <p>3. Dibuja polígonos para análisis espacial</p>
            <p>4. Haz clic en "Procesar Datos" para obtener análisis</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}