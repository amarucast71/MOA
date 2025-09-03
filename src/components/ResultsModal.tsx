import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, MapPin, Shapes, Calculator } from 'lucide-react';

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

interface ResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataPoints: DataPoint[];
  polygons: Polygon[];
  excelData: any[];
}

export function ResultsModal({ isOpen, onClose, dataPoints, polygons, excelData }: ResultsModalProps) {
  // Calculate statistics
  const calculateStats = () => {
    if (dataPoints.length === 0) return null;

    const values = dataPoints.map(p => p.moValue || p.value);
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);
    const std = Math.sqrt(values.reduce((sq, n) => sq + Math.pow(n - avg, 2), 0) / values.length);

    return { sum, avg, max, min, std, count: values.length };
  };

  const stats = calculateStats();

  // Prepare chart data
  const chartData = dataPoints.map(point => ({
    name: point.name,
    valor: point.moValue || point.value,
    mo: point.moValue || point.value,
    lat: point.lat,
    lng: point.lng
  }));

  // Value distribution for pie chart
  const getValueDistribution = () => {
    if (!stats) return [];
    
    const ranges = [
      { name: 'Bajo (< 80)', min: 0, max: 80, color: '#ef4444' },
      { name: 'Medio (80-90)', min: 80, max: 90, color: '#f59e0b' },
      { name: 'Alto (90+)', min: 90, max: 100, color: '#10b981' }
    ];

    return ranges.map(range => ({
      name: range.name,
      value: dataPoints.filter(p => (p.moValue || p.value) >= range.min && (p.moValue || p.value) < range.max).length,
      color: range.color
    }));
  };

  const distributionData = getValueDistribution();

  // Points within polygons analysis
  const getPolygonAnalysis = () => {
    if (polygons.length === 0) return [];

    return polygons.map(polygon => {
      const pointsInside = dataPoints.filter(point => {
        // Simple point-in-polygon algorithm
        const x = point.lat * 10;
        const y = point.lng * 10;
        let inside = false;
        
        for (let i = 0, j = polygon.coordinates.length - 1; i < polygon.coordinates.length; j = i++) {
          const [xi, yi] = polygon.coordinates[i];
          const [xj, yj] = polygon.coordinates[j];
          
          if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
            inside = !inside;
          }
        }
        
        return inside;
      });

      const avgValue = pointsInside.length > 0 
        ? pointsInside.reduce((sum, p) => sum + (p.moValue || p.value), 0) / pointsInside.length 
        : 0;

      return {
        name: polygon.name,
        pointsCount: pointsInside.length,
        avgValue: avgValue,
        totalValue: pointsInside.reduce((sum, p) => sum + (p.moValue || p.value), 0)
      };
    });
  };

  const polygonAnalysis = getPolygonAnalysis();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Resultados del Análisis
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Statistics Cards */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{stats.count}</div>
                    <div className="text-sm text-muted-foreground">Total Puntos</div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{stats.avg.toFixed(1)}</div>
                    <div className="text-sm text-muted-foreground">Promedio</div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{stats.max.toFixed(1)}</div>
                    <div className="text-sm text-muted-foreground">Máximo</div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{stats.min.toFixed(1)}</div>
                    <div className="text-sm text-muted-foreground">Mínimo</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Valores MO por Punto
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="valor" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Distribución de Valores</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={distributionData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {distributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Polygon Analysis */}
          {polygonAnalysis.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shapes className="w-5 h-5" />
                  Análisis por Polígono
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {polygonAnalysis.map((analysis, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{analysis.name}</h4>
                        <Badge variant="outline">{analysis.pointsCount} puntos</Badge>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Puntos incluidos:</span>
                          <div className="font-medium">{analysis.pointsCount}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Valor promedio:</span>
                          <div className="font-medium">{analysis.avgValue.toFixed(1)}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Valor total:</span>
                          <div className="font-medium">{analysis.totalValue.toFixed(1)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Detailed Data Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Datos Detallados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Nombre</th>
                      <th className="text-left p-2">Latitud</th>
                      <th className="text-left p-2">Longitud</th>
                      <th className="text-left p-2">Valor MO</th>
                      <th className="text-left p-2">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dataPoints.map(point => (
                      <tr key={point.id} className="border-b">
                        <td className="p-2 font-medium">{point.name}</td>
                        <td className="p-2">{point.lat.toFixed(4)}</td>
                        <td className="p-2">{point.lng.toFixed(4)}</td>
                        <td className="p-2">{(point.moValue || point.value).toFixed(1)}</td>
                        <td className="p-2">
                          <Badge variant={(point.moValue || point.value) >= 90 ? "default" : (point.moValue || point.value) >= 80 ? "secondary" : "destructive"}>
                            {(point.moValue || point.value) >= 90 ? "Alto" : (point.moValue || point.value) >= 80 ? "Medio" : "Bajo"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          {stats && (
            <Card>
              <CardHeader>
                <CardTitle>Resumen Ejecutivo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <p>
                    Se analizaron <strong>{stats.count} puntos de datos</strong> con un valor promedio de <strong>{stats.avg.toFixed(1)}</strong>.
                  </p>
                  <p>
                    El rango de valores va desde <strong>{stats.min.toFixed(1)}</strong> hasta <strong>{stats.max.toFixed(1)}</strong>,
                    con una desviación estándar de <strong>{stats.std.toFixed(1)}</strong>.
                  </p>
                  {polygons.length > 0 && (
                    <p>
                      Se definieron <strong>{polygons.length} polígonos</strong> para análisis espacial específico.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}