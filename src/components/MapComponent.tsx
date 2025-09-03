import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { MapPin, Shapes, Move, Plus, ZoomIn, ZoomOut } from 'lucide-react';

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

interface MapComponentProps {
  dataPoints: DataPoint[];
  polygons: Polygon[];
  onAddPolygon: (polygon: Polygon) => void;
  onAddPoint: (point: DataPoint) => void;
}

export function MapComponent({ dataPoints, polygons, onAddPolygon, onAddPoint }: MapComponentProps) {
  const [isDrawingPolygon, setIsDrawingPolygon] = useState(false);
  const [isAddingPoint, setIsAddingPoint] = useState(false);
  const [currentPolygonPoints, setCurrentPolygonPoints] = useState<[number, number][]>([]);
  const [mapCenter, setMapCenter] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(2);
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  
  // Modal state for adding points
  const [showPointModal, setShowPointModal] = useState(false);
  const [pendingPoint, setPendingPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [pointName, setPointName] = useState('');
  const [pointMOValue, setPointMOValue] = useState('');
  
  const mapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ArcGIS World Imagery tile service
  const TILE_SIZE = 256;
  const ARCGIS_TILE_URL = "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

  // Convert lat/lng to tile coordinates
  const latLngToTile = useCallback((lat: number, lng: number, z: number) => {
    const latRad = lat * Math.PI / 180;
    const n = Math.pow(2, z);
    const x = Math.floor((lng + 180) / 360 * n);
    const y = Math.floor((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2 * n);
    return { x, y, z };
  }, []);

  // Convert tile coordinates to lat/lng
  const tileToLatLng = useCallback((x: number, y: number, z: number) => {
    const n = Math.pow(2, z);
    const lng = x / n * 360 - 180;
    const latRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n)));
    const lat = latRad * 180 / Math.PI;
    return { lat, lng };
  }, []);

  // Convert screen coordinates to lat/lng
  const screenToLatLng = useCallback((screenX: number, screenY: number) => {
    if (!mapRef.current) return { lat: 0, lng: 0 };
    const rect = mapRef.current.getBoundingClientRect();
    
    // Get pixel coordinates relative to map center
    const pixelX = (screenX - rect.left - rect.width / 2) / zoom + mapCenter.x;
    const pixelY = (screenY - rect.top - rect.height / 2) / zoom + mapCenter.y;
    
    // Convert to tile coordinates
    const tileZ = Math.max(1, Math.min(18, Math.round(zoom + 10)));
    const scale = Math.pow(2, tileZ);
    const tileX = pixelX / TILE_SIZE + scale / 2;
    const tileY = pixelY / TILE_SIZE + scale / 2;
    
    return tileToLatLng(tileX, tileY, tileZ);
  }, [mapCenter, zoom, tileToLatLng]);

  // Convert lat/lng to screen coordinates
  const latLngToScreen = useCallback((lat: number, lng: number) => {
    if (!mapRef.current) return { x: 0, y: 0 };
    const rect = mapRef.current.getBoundingClientRect();
    
    const tileZ = Math.max(1, Math.min(18, Math.round(zoom + 10)));
    const tile = latLngToTile(lat, lng, tileZ);
    const scale = Math.pow(2, tileZ);
    
    const pixelX = (tile.x - scale / 2) * TILE_SIZE;
    const pixelY = (tile.y - scale / 2) * TILE_SIZE;
    
    const screenX = (pixelX - mapCenter.x) * zoom + rect.width / 2;
    const screenY = (pixelY - mapCenter.y) * zoom + rect.height / 2;
    
    return { x: screenX, y: screenY };
  }, [mapCenter, zoom, latLngToTile]);

  // Draw map tiles
  const drawMap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    // Clear canvas
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Calculate visible tile range
    const tileZ = Math.max(1, Math.min(18, Math.round(zoom + 8)));
    const scale = Math.pow(2, tileZ);
    const centerTileX = scale / 2 + mapCenter.x / TILE_SIZE;
    const centerTileY = scale / 2 + mapCenter.y / TILE_SIZE;
    
    const tilesX = Math.ceil(canvas.width / (TILE_SIZE * zoom)) + 2;
    const tilesY = Math.ceil(canvas.height / (TILE_SIZE * zoom)) + 2;
    
    const startTileX = Math.floor(centerTileX - tilesX / 2);
    const startTileY = Math.floor(centerTileY - tilesY / 2);
    
    // Load and draw tiles
    for (let tx = startTileX; tx < startTileX + tilesX; tx++) {
      for (let ty = startTileY; ty < startTileY + tilesY; ty++) {
        if (tx >= 0 && ty >= 0 && tx < scale && ty < scale) {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            const pixelX = (tx - scale / 2) * TILE_SIZE;
            const pixelY = (ty - scale / 2) * TILE_SIZE;
            const screenX = (pixelX - mapCenter.x) * zoom + canvas.width / 2;
            const screenY = (pixelY - mapCenter.y) * zoom + canvas.height / 2;
            
            ctx.drawImage(img, screenX, screenY, TILE_SIZE * zoom, TILE_SIZE * zoom);
          };
          img.src = ARCGIS_TILE_URL.replace('{z}', tileZ.toString()).replace('{x}', tx.toString()).replace('{y}', ty.toString());
        }
      }
    }
  }, [mapCenter, zoom]);

  // Redraw map when parameters change
  useEffect(() => {
    drawMap();
  }, [drawMap]);

  const handleMapClick = (e: React.MouseEvent) => {
    if (isDragging) return;
    
    if (isDrawingPolygon) {
      const latLng = screenToLatLng(e.clientX, e.clientY);
      setCurrentPolygonPoints(prev => [...prev, [latLng.lat, latLng.lng]]);
    } else if (isAddingPoint) {
      const latLng = screenToLatLng(e.clientX, e.clientY);
      setPendingPoint(latLng);
      setShowPointModal(true);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isDrawingPolygon || isAddingPoint) return;
    setIsDragging(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || isDrawingPolygon || isAddingPoint) return;
    
    const deltaX = e.clientX - lastMousePos.x;
    const deltaY = e.clientY - lastMousePos.y;
    
    setMapCenter(prev => ({
      x: prev.x - deltaX / zoom,
      y: prev.y - deltaY / zoom
    }));
    
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const finishPolygon = () => {
    if (currentPolygonPoints.length >= 3) {
      const newPolygon: Polygon = {
        id: `polygon-${Date.now()}`,
        coordinates: currentPolygonPoints,
        name: `Polígono ${polygons.length + 1}`
      };
      onAddPolygon(newPolygon);
    }
    setCurrentPolygonPoints([]);
    setIsDrawingPolygon(false);
  };

  const startDrawingPolygon = () => {
    setIsDrawingPolygon(true);
    setIsAddingPoint(false);
    setCurrentPolygonPoints([]);
  };

  const startAddingPoint = () => {
    setIsAddingPoint(true);
    setIsDrawingPolygon(false);
    setCurrentPolygonPoints([]);
  };

  const cancelDrawing = () => {
    setIsDrawingPolygon(false);
    setIsAddingPoint(false);
    setCurrentPolygonPoints([]);
  };

  const handleSavePoint = () => {
    if (!pendingPoint || !pointName || !pointMOValue) return;
    
    const newPoint: DataPoint = {
      id: `manual-point-${Date.now()}`,
      lat: pendingPoint.lat,
      lng: pendingPoint.lng,
      name: pointName,
      value: parseFloat(pointMOValue) || 0,
      moValue: parseFloat(pointMOValue) || 0
    };
    
    onAddPoint(newPoint);
    setShowPointModal(false);
    setPendingPoint(null);
    setPointName('');
    setPointMOValue('');
    setIsAddingPoint(false);
  };

  const zoomIn = () => {
    setZoom(prev => Math.min(prev * 1.5, 20));
  };

  const zoomOut = () => {
    setZoom(prev => Math.max(prev / 1.5, 0.1));
  };

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Map Controls */}
      <Card className="absolute top-4 left-4 z-10 p-2">
        <div className="flex flex-col gap-2">
          <Button
            variant={isDrawingPolygon ? "destructive" : "default"}
            size="sm"
            onClick={isDrawingPolygon ? cancelDrawing : startDrawingPolygon}
          >
            <Shapes className="w-4 h-4 mr-2" />
            {isDrawingPolygon ? 'Cancelar Polígono' : 'Dibujar Polígono'}
          </Button>
          
          <Button
            variant={isAddingPoint ? "destructive" : "outline"}
            size="sm"
            onClick={isAddingPoint ? cancelDrawing : startAddingPoint}
          >
            <Plus className="w-4 h-4 mr-2" />
            {isAddingPoint ? 'Cancelar Punto' : 'Agregar Punto'}
          </Button>
          
          {isDrawingPolygon && currentPolygonPoints.length >= 3 && (
            <Button size="sm" onClick={finishPolygon} variant="outline">
              Finalizar Polígono
            </Button>
          )}
          
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={zoomIn}>
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={zoomOut}>
              <ZoomOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Map Legend */}
      <Card className="absolute top-4 right-4 z-10 p-3">
        <h3 className="mb-2">Leyenda</h3>
        <div className="space-y-1 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span>Puntos de datos ({dataPoints.length})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500/30 border border-green-500"></div>
            <span>Polígonos ({polygons.length})</span>
          </div>
        </div>
      </Card>

      {/* Map Canvas */}
      <div className="relative w-full h-full">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ cursor: isDragging ? 'grabbing' : (isDrawingPolygon || isAddingPoint) ? 'crosshair' : 'grab' }}
        />
        
        <div
          ref={mapRef}
          className="absolute inset-0 w-full h-full"
          onClick={handleMapClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Render Data Points */}
          {dataPoints.map(point => {
            const screenPos = latLngToScreen(point.lat, point.lng);
            const isVisible = screenPos.x >= -20 && screenPos.x <= window.innerWidth + 20 && 
                            screenPos.y >= -20 && screenPos.y <= window.innerHeight + 20;
            
            if (!isVisible) return null;
            
            return (
              <div
                key={point.id}
                className="absolute w-4 h-4 bg-blue-500 rounded-full transform -translate-x-1/2 -translate-y-1/2 z-20 border-2 border-white shadow-lg cursor-pointer"
                style={{
                  left: screenPos.x,
                  top: screenPos.y,
                }}
                title={`${point.name}: MO=${point.moValue || point.value}`}
              >
                <div className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-black text-white px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 hover:opacity-100 transition-opacity z-30">
                  {point.name}<br/>MO: {point.moValue || point.value}
                </div>
              </div>
            );
          })}

          {/* Render Current Drawing Polygon */}
          {currentPolygonPoints.length > 0 && (
            <>
              {currentPolygonPoints.map((point, index) => {
                const screenPos = latLngToScreen(point[0], point[1]);
                return (
                  <div
                    key={index}
                    className="absolute w-3 h-3 bg-red-500 rounded-full transform -translate-x-1/2 -translate-y-1/2 z-30"
                    style={{
                      left: screenPos.x,
                      top: screenPos.y,
                    }}
                  />
                );
              })}
              
              {currentPolygonPoints.length > 1 && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-25">
                  <polyline
                    points={currentPolygonPoints.map(point => {
                      const screenPos = latLngToScreen(point[0], point[1]);
                      return `${screenPos.x},${screenPos.y}`;
                    }).join(' ')}
                    fill="none"
                    stroke="rgb(239, 68, 68)"
                    strokeWidth="2"
                    strokeDasharray="5,5"
                  />
                </svg>
              )}
            </>
          )}

          {/* Render Polygons */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-15">
            {polygons.map(polygon => {
              const screenPoints = polygon.coordinates.map(([lat, lng]) => {
                const screenPos = latLngToScreen(lat, lng);
                return `${screenPos.x},${screenPos.y}`;
              }).join(' ');

              return (
                <polygon
                  key={polygon.id}
                  points={screenPoints}
                  fill="rgba(34, 197, 94, 0.2)"
                  stroke="rgb(34, 197, 94)"
                  strokeWidth="2"
                />
              );
            })}
          </svg>
        </div>
      </div>

      {/* Instructions */}
      {(isDrawingPolygon || isAddingPoint) && (
        <Card className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10 p-3">
          <p className="text-sm text-center">
            {isDrawingPolygon 
              ? "Haz clic para agregar puntos al polígono. Necesitas al menos 3 puntos para finalizar."
              : "Haz clic en el mapa para agregar un nuevo punto con valor MO."
            }
          </p>
        </Card>
      )}

      {/* Point Addition Modal */}
      <Dialog open={showPointModal} onOpenChange={setShowPointModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Nuevo Punto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="pointName">Nombre del Punto</Label>
              <Input
                id="pointName"
                value={pointName}
                onChange={(e) => setPointName(e.target.value)}
                placeholder="Ej: Punto A"
              />
            </div>
            <div>
              <Label htmlFor="moValue">Valor MO</Label>
              <Input
                id="moValue"
                type="number"
                step="0.1"
                value={pointMOValue}
                onChange={(e) => setPointMOValue(e.target.value)}
                placeholder="Ej: 85.5"
              />
            </div>
            {pendingPoint && (
              <div className="text-sm text-muted-foreground">
                <p>Coordenadas: {pendingPoint.lat.toFixed(6)}, {pendingPoint.lng.toFixed(6)}</p>
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowPointModal(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSavePoint}
                disabled={!pointName || !pointMOValue}
              >
                Guardar Punto
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}