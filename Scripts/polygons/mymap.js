var map;






function provinceMap(mapdata, leg, level) {
    if (map != null) {
        map.remove();
    }
    var center = [29.642814, 70.030772];
    var zoomLevel = 5;
    googleMap = googleMap = L.tileLayer('http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', { maxZoom: 20, subdomains: ['mt0', 'mt1', 'mt2', 'mt3'] });
    var osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' });
    var osmHOT = L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap contributors, Tiles style by Humanitarian OpenStreetMap Team hosted by OpenStreetMap France' });
    var googleStreets = L.tileLayer('http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', { maxZoom: 20, subdomains: ['mt0', 'mt1', 'mt2', 'mt3'] });
    var esriSatellite = L.tileLayer('http://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 18, });
    var baseMaps = {
        "OpenStreetMap": osm,
        "OpenStreetMap.HOT": osmHOT,
        "Google Satellite": googleMap,
        "Esri": esriSatellite,
    };
    var overlayMaps = {
    };
    map = L.map("map", { center: center, zoomControl: false, zoom: zoomLevel, layers: [googleStreets] });
    var layerControl = L.control.layers(baseMaps, overlayMaps).addTo(map);
    layerControl.addTo(map);
    map.invalidateSize();

    L.control.zoom({
        position: 'bottomleft'
    }).addTo(map);
    
    // control that shows state info on hover
    var info = L.control();

    info.onAdd = function (mymap) {
        this._div = L.DomUtil.create('div', 'info hover left');
        this.position = 'topleft';
        this.update();
        return this._div;
    };

    
    info.update = function (props) {
        this._div.innerHTML = '' + (props ?
            '<b>' + props.name.replace("DISTRICT", "").replace("DIVISION","") + '</b><br />' + props.value + '  / ' + leg.quantity
            : leg.series);
    };

    info.addTo(map);
    
    gap = leg.gap;

    // get color depending on population value value
    function getColor(d) {
        return d > gap[4] ? '#044526' :
            d > gap[3] ? '#11874f' :
                d > gap[2] ? '#17b741' :
                    d > gap[1] ? '#55cd74' :
                        d > gap[0] ? '#a3f9ba' :
                            '#dcf9e4';
    }

    function getColor(d, unit) {
        if (unit == 'K') {
            d = d / 1000;
        }
        else if (unit == 'M') {
            d = d / 1000000;
        }

        return d > gap[4] ? '#044526' :
            d > gap[3] ? '#11874f' :
                d > gap[2] ? '#17b741' :
                    d > gap[1] ? '#55cd74' :
                        d > gap[0] ? '#a3f9ba' :
                            '#dcf9e4';
    }

    function style(feature) {
        if (feature.properties.data != null) {
            return {
                weight: 2,
                opacity: 1,
                color: 'blue',
                dashArray: '3',
                fillOpacity: 0.7,
                fillColor: getColor(feature.properties.data.value,leg.unit)
            };
        }
        else {
            return {
                weight: 2,
                opacity: 1,
                color: 'blue',
                dashArray: '3',
                fillOpacity: 0.7,
                fillColor: 'white'
            };
        }
        
    }

    function performMapClick() {
        if (level == "Provinces") {
            $('.hbtn.v').trigger('click');
        }
        else if (level == "Divisions") {
            $('.hbtn.d').trigger('click');
        }
    }

    function highlightFeature(e) {
        var layer = e.target;

        layer.setStyle({
            weight: 5,
            color: 'black',
            dashArray: '',
            fillOpacity: 0.7
        });

        if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
            layer.bringToFront();
        }

        info.update(layer.feature.properties.data);
    }

    var geojson;

    function resetHighlight(e) {
        geojson.resetStyle(e.target);
        info.update();
    }

    function zoomToFeature(e) {
        map.fitBounds(e.target.getBounds());
    }

    function onEachFeature(feature, layer) {
        layer.on({
            mouseover: highlightFeature,
            mouseout: resetHighlight,
            click: performMapClick
        });
    }
    
    geojson = L.geoJson(mapdata, {
        style: style,
        onEachFeature: onEachFeature
    }).addTo(map);

    //map.attributionControl.addAttribution('Credit data &copy; <a href="http://pbs.gov.pk/">PBS</a>');


    var legend = L.control({ position: 'bottomright' });

    legend.onAdd = function (map) {
        var div = L.DomUtil.create('div', 'info legend'),
            labels = [],
            from, to;
        
        for (var i = 0; i < gap.length; i++) {
            from = gap[i];
            to = gap[i + 1];
            labels.push(
                '<i style="background-color:' + getColor(from == 0 ? from : from + 1) + '"></i> ' +
                (from + (to ? ''+leg.unit + ' &ndash;' + to : leg.unit+' +')));
        }

        div.innerHTML = labels.join('<br>');
        return div;
    };

    legend.addTo(map);
}

const formatBoundariesAsGeoJSON = (bouns, progressData) => {
    const features = bouns.map(boundary => {
        const progress = progressData.find(progress => parseInt(progress.id) === parseInt(boundary.code));
        return {
            type: "Feature",
            geometry: boundary.boundary,
            properties: {
                level: boundary.next_level,
                name: boundary.name,
                code: boundary.code,
                data: progress ? progress : null
            }
        };
    });

    // Create GeoJSON FeatureCollection
    const geoJSON = {
        type: "FeatureCollection",
        features: features
    };
    return geoJSON;
};


