import React, { useMemo } from 'react';
import { StyleSheet, View, ActivityIndicator, Text } from 'react-native';
import { WebView } from 'react-native-webview';

/**
 * MapLibre GL Map - Clean, no attribution
 * Uses Protomaps free vector tiles for better labels
 */
const LeafletMapComponent = ({
    origin,
    destination,
    driverLocation,
    style
}) => {

    const getCoord = (loc) => {
        if (!loc) return null;
        const lat = parseFloat(loc.latitude || loc.lat || 0);
        const lng = parseFloat(loc.longitude || loc.lng || 0);
        if (lat === 0 && lng === 0) return null;
        return [lng, lat];
    };

    const driver = getCoord(driverLocation);
    const pickup = getCoord(origin);
    const delivery = getCoord(destination);
    const center = driver || pickup || delivery;

    const markers = useMemo(() => {
        const m = [];
        if (driver) m.push({ coords: driver, type: 'driver', icon: '🚗', label: 'Votre Position' });
        if (pickup) m.push({ coords: pickup, type: 'pickup', icon: '📦', label: 'Collecte' });
        if (delivery) m.push({ coords: delivery, type: 'delivery', icon: '🏠', label: 'Livraison' });
        return m;
    }, [driver, pickup, delivery]);

    const routeCoords = markers.map(m => m.coords);

    if (!center) {
        return (
            <View style={[styles.container, styles.placeholder, style]}>
                <Text style={styles.placeholderIcon}>📍</Text>
                <Text style={styles.placeholderText}>Chargement...</Text>
            </View>
        );
    }

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=yes">
    <script src="https://unpkg.com/maplibre-gl@4.1.2/dist/maplibre-gl.js"></script>
    <link href="https://unpkg.com/maplibre-gl@4.1.2/dist/maplibre-gl.css" rel="stylesheet">
    <style>
        *{margin:0;padding:0;box-sizing:border-box}
        html,body,#map{width:100%;height:100%}
        
        /* Hide ALL MapLibre attribution and logos */
        .maplibregl-ctrl-attrib,
        .maplibregl-ctrl-logo,
        .maplibregl-ctrl-attrib-inner,
        .maplibregl-compact-show,
        .maplibregl-ctrl-bottom-left .maplibregl-ctrl,
        .maplibregl-ctrl-bottom-right .maplibregl-ctrl-attrib {
            display:none !important;
            opacity:0 !important;
            visibility:hidden !important;
        }
        
        .marker{
            width:48px;height:48px;
            display:flex;align-items:center;justify-content:center;
            font-size:28px;
            background:#fff;
            border-radius:50%;
            box-shadow:0 4px 14px rgba(0,0,0,.4);
            border:3px solid;
        }
        .marker-driver{border-color:#16a34a}
        .marker-pickup{border-color:#2563eb}
        .marker-delivery{border-color:#dc2626}
        .maplibregl-popup-content{
            padding:12px 16px;
            border-radius:10px;
            font:600 15px -apple-system,system-ui,sans-serif;
        }
        .maplibregl-ctrl-group{border-radius:10px!important;box-shadow:0 2px 8px rgba(0,0,0,.15)!important}
        
        .layer-toggle{
            position:absolute;
            top:10px;
            left:10px;
            background:#fff;
            border:none;
            border-radius:10px;
            padding:10px 14px;
            font:600 13px -apple-system,system-ui,sans-serif;
            box-shadow:0 2px 8px rgba(0,0,0,.2);
            cursor:pointer;
            z-index:1000;
            display:flex;
            align-items:center;
            gap:6px;
        }
        .layer-toggle:active{background:#f3f4f6}
    </style>
</head>
<body>
<div id="map"></div>
<button class="layer-toggle" id="toggleBtn" onclick="toggleLayer()">
    <span id="toggleIcon">🗺️</span>
    <span id="toggleText">Satellite</span>
</button>
<script>
let currentLayer = 'street';

// Use OpenFreeMap vector tiles - has good label coverage
const streetStyle = 'https://tiles.openfreemap.org/styles/liberty';

const satelliteStyle = {
    version:8,
    sources:{
        satellite:{
            type:'raster',
            tiles:['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
            tileSize:256,
            maxzoom:19
        }
    },
    layers:[{id:'satellite',type:'raster',source:'satellite'}]
};

const map = new maplibregl.Map({
    container:'map',
    style: streetStyle,
    center:[${center[0]},${center[1]}],
    zoom:15,
    attributionControl: false,
    dragPan:true,
    scrollZoom:true,
    touchZoomRotate:true,
    doubleClickZoom:true
});

map.addControl(new maplibregl.NavigationControl({showCompass:false}),'top-right');

function toggleLayer(){
    if(currentLayer === 'street'){
        map.setStyle(satelliteStyle);
        document.getElementById('toggleIcon').textContent = '🛰️';
        document.getElementById('toggleText').textContent = 'Plan';
        currentLayer = 'satellite';
    } else {
        map.setStyle(streetStyle);
        document.getElementById('toggleIcon').textContent = '🗺️';
        document.getElementById('toggleText').textContent = 'Satellite';
        currentLayer = 'street';
    }
    map.once('styledata', addMarkersAndRoute);
}

const markersData = ${JSON.stringify(markers)};
const routeData = ${JSON.stringify(routeCoords)};
let markerElements = [];

function addMarkersAndRoute(){
    const bounds = new maplibregl.LngLatBounds();
    
    markerElements.forEach(m => m.remove());
    markerElements = [];
    
    markersData.forEach(m=>{
        const el=document.createElement('div');
        el.className='marker marker-'+m.type;
        el.innerHTML=m.icon;
        
        const popup=new maplibregl.Popup({offset:28,closeButton:false})
            .setHTML('<div>'+m.icon+' <b>'+m.label+'</b></div>');
        
        const marker = new maplibregl.Marker({element:el})
            .setLngLat(m.coords)
            .setPopup(popup)
            .addTo(map);
        
        markerElements.push(marker);
        bounds.extend(m.coords);
    });
    
    if(routeData.length > 1){
        try {
            if(map.getSource('route')){
                map.removeLayer('route-shadow');
                map.removeLayer('route');
                map.removeSource('route');
            }
        } catch(e){}
        
        map.addSource('route',{
            type:'geojson',
            data:{type:'Feature',geometry:{type:'LineString',coordinates:routeData}}
        });
        map.addLayer({
            id:'route-shadow',type:'line',source:'route',
            paint:{'line-color':'#2563eb','line-width':10,'line-opacity':0.25,'line-blur':4}
        });
        map.addLayer({
            id:'route',type:'line',source:'route',
            layout:{'line-cap':'round','line-join':'round'},
            paint:{'line-color':'#2563eb','line-width':4}
        });
    }
    
    if(markersData.length > 1){
        map.fitBounds(bounds,{padding:60,maxZoom:16});
    }
}

map.on('load', addMarkersAndRoute);
</script>
</body>
</html>`;

    return (
        <View style={[styles.container, style]}>
            <WebView
                originWhitelist={['*']}
                source={{ html }}
                style={styles.webview}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                startInLoadingState={true}
                renderLoading={() => (
                    <View style={styles.loading}>
                        <ActivityIndicator size="large" color="#2563eb" />
                    </View>
                )}
                scrollEnabled={false}
                nestedScrollEnabled={true}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        borderRadius: 14,
        overflow: 'hidden',
        minHeight: 350,
    },
    webview: {
        flex: 1,
        backgroundColor: '#e5e7eb',
    },
    loading: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
    },
    placeholder: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
        minHeight: 350,
    },
    placeholderIcon: {
        fontSize: 40,
        marginBottom: 8,
    },
    placeholderText: {
        color: '#9ca3af',
        fontSize: 15,
    },
});

export default LeafletMapComponent;
