import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { UserRole } from '../types';

declare global {
  interface Window {
    google: any;
  }
}

const CourierMapView = () => {
    const { users } = useAppContext();
    const mapRef = useRef<HTMLDivElement>(null);
    const [isMapReady, setIsMapReady] = useState(false);
    const couriersWithLocation = users.filter(u => u.roles.includes(UserRole.COURIER) && u.location);

    useEffect(() => {
        const checkGoogleMaps = () => {
            if (window.google && window.google.maps) {
                setIsMapReady(true);
            } else {
                setTimeout(checkGoogleMaps, 100); // Check again shortly
            }
        };
        checkGoogleMaps();
    }, []);

    useEffect(() => {
        if (!isMapReady || !mapRef.current) return;

        const map = new window.google.maps.Map(mapRef.current, {
            center: { lat: 30.0444, lng: 31.2357 }, // Center of Cairo
            zoom: 11,
            mapTypeControl: false,
            streetViewControl: false,
        });

        const infoWindow = new window.google.maps.InfoWindow();

        couriersWithLocation.forEach(courier => {
            if (!courier.location) return;
            const marker = new window.google.maps.Marker({
                position: courier.location,
                map: map,
                title: courier.name,
                animation: window.google.maps.Animation.DROP,
            });

            marker.addListener('click', () => {
                infoWindow.setContent(`
                    <div class="font-sans">
                        <div class="font-bold text-md">${courier.name}</div>
                        <div class="text-sm text-muted-foreground">Zone: ${courier.zones?.join(', ')}</div>
                    </div>
                `);
                infoWindow.open(map, marker);
            });
        });

    }, [isMapReady, couriersWithLocation]);
    
    return (
         <div className="card h-full w-full flex flex-col overflow-hidden p-0">
             <div className="p-5 border-b border-border">
                <h2 className="text-xl font-bold text-foreground">Live Courier Tracking</h2>
                <p className="text-muted-foreground mt-1 text-sm">Real-time locations of all active couriers.</p>
            </div>
            <div className="flex-1 bg-secondary">
                {!isMapReady ? (
                     <div className="w-full h-full flex items-center justify-center flex-col gap-4">
                        <p className="text-muted-foreground font-semibold">Loading Map...</p>
                        <p className="text-xs text-muted-foreground max-w-sm text-center">If the map doesn't load, please ensure the Google Maps API key is set correctly in your environment and has the "Maps JavaScript API" enabled.</p>
                     </div>
                ) : (
                    <div ref={mapRef} className="w-full h-full"></div>
                )}
            </div>
        </div>
    );
};

export default CourierMapView;