var map;
function provinceMap(province,pvid, mapdata, lat, lon, zoom) {
    var map = L.map('prv'+pvid).setView([lat, lon], zoom);

    



    map.zoomControl.remove();
    L.control.zoom({
        position: 'topleft'
    }).addTo(map);
    // control that shows state info on hover
    var info = L.control();

    info.onAdd = function (mymap) {
        this._div = L.DomUtil.create('div', 'info hover');
        this.update();
        return this._div;
    };


    info.update = function (props) {
        this._div.innerHTML = '' + (props ?
            '<b>' + props.ds.replace("DISTRICT", "") + '</b><br />' + props.value + '  / Unit'
            : 'Crops Data');
    };

    info.addTo(map);


    // get color depending on population value value
    function getColor(d) {

        /*
        return d > 10 ? '#5d4a04' :
            d > 8 ? '#696611' :
                d > 5 ? 'darkgoldenrod' :
                    d > 2 ? '#dba92e' :
                        d > 0 ? '#b9b530' :
                            'darkgrey';
        */

        return d > 10 ? '#044526' :
            d > 8 ? '#11874f' :
                d > 5 ? '#17b741' :
                    d > 2 ? '#55cd74' :
                        d > 0 ? '#a3f9ba' :
                            '#dcf9e4';
    }

    function style(feature) {
        return {
            weight: 2,
            opacity: 1,
            color: 'white',
            dashArray: '3',
            fillOpacity: 0.7,
            fillColor: getColor(feature.properties.value)
        };
    }

    function highlightFeature(e) {
        var layer = e.target;

        layer.setStyle({
            weight: 5,
            color: '#666',
            dashArray: '',
            fillOpacity: 0.7
        });

        if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
            layer.bringToFront();
        }

        info.update(layer.feature.properties);
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
            click: provinceMap
        });
    }


    geojson = L.geoJson(mapdata, {
        style: style,
        onEachFeature: onEachFeature
    }).addTo(map);

    //map.attributionControl.addAttribution('Credit data &copy; <a href="http://pbs.gov.pk/">PBS</a>');


    var legend = L.control({position: 'bottomright' });

    legend.onAdd = function (map) {
        var div = L.DomUtil.create('div', 'info legend'),
            grades = [0, 2, 5, 8, 10],
            labels = [],
            from, to;

        for (var i = 0; i < grades.length; i++) {
            from = grades[i];
            to = grades[i + 1];

            labels.push(
                '<i style="background-color:' + getColor(from==0? from: from+1) + '"></i> ' +
                (from==0? '0': from + (to ? '&ndash;' + to : '+')));
        }

        div.innerHTML = labels.join('<br>');
        return div;
    };

    legend.addTo(map);
}


    
    

function LoadMapData(province, pvid, lat, lon, zoom) {
    map = null;
    var mapdata = $.grep(mypolygon.features, function (e) { return e.properties.pvid == pvid });
    provinceMap(province,pvid, mapdata, lat, lon, zoom);
    //displayProMap(par);
}