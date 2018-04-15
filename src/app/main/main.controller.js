'use strict';

var navigator, $, document;

/* jshint devel:true */

angular.module('ritmica')
  .controller('MainCtrl', function ($scope, uiGmapGoogleMapApi, filterFilter, markers) {
    
    // lazy load Google Maps API
    // ============================= //
    uiGmapGoogleMapApi.then(function(maps) {

      // var ritmicaLatLng = new maps.LatLng(51.162915818477146, 4.46370585193824);


      // Initialize / Update All Markers Array
      // ============================= //

      function initAllMarkers() {
        $scope.filteredMarkers = $scope.markerList;
        $scope.categorieIncludes = [''];
        $scope.allMarkers = $scope.extraMarkers.concat($scope.markerList);
      }

      function updateAllMarkers() {
        $scope.allMarkers = $scope.extraMarkers.concat($scope.filteredMarkers);
        // !!! punten terug op kaart plotten??
      }   


      // MarkerEvents (markerEvents)
      // ============================= //

      $scope.markerEvents = {
        events: {
          mouseover: function(marker) {
            marker.model.show = true;
          },
          mouseout: function(marker) {
            marker.model.show = false;
          },
          click: function(marker) {
            $scope.openInfoWindow(marker.model);
            centerMapOnMarker(marker.model);
            marker.model.show = false;
          }
        }
      };


      // Geo-location (currentLocation)
      // ============================= //

      function geoLocate () {

        if(navigator.geolocation) {

          navigator.geolocation.getCurrentPosition(function(position) {

            $scope.currentLocation = {
              id: 'current',
              latitude: position.coords.latitude, 
              longitude: position.coords.longitude,
              organisatie: 'Huidige locatie',
              categorie: 'location',
              icon: 'app/images/location.png',
              alinea1: '',
              alinea2: '',
            };

            $scope.extraMarkers.push($scope.currentLocation);
            updateAllMarkers();

          }, function() {
            // content = 'Error: The Geolocation service failed.';
          });

        } else { // Browser doesn't support Geolocation
          // content = 'Error: Your browser doesn\'t support geolocation.';
        }
      }

      // Center Map On Marker 
      // ============================= //

      var centerMapOnMarker = function (marker) {
        var map = $scope.map;
        map.center.latitude = marker.latitude;
        map.center.longitude = marker.longitude;
      };

      var centerDirectionsMapOnMarker = function (marker) {
        var map = $scope.directionsMap;
        var lt = new maps.LatLng(marker.latitude, marker.longitude);
        $scope.directionsCenterMarker.setPosition(lt);
        map.setCenter(lt); 
      };


      // Open Info Window = overlay (activeMarker, directionsMap)
      // ============================= //

      $scope.openInfoWindow = function(marker) {
        $scope.activeMarker = marker;

        // Bij huidige locatie hoeft de overlay niet geopend te worden
        if (marker.id === 'current') {
          return;
        }

        $('.marker-info').show();
        centerMapOnMarker(marker);

        if (!$scope.directionsMap) {
          // als map nog niet bestaat: lazy load
          var mapOptions = {
            zoom: 15,
            center: new maps.LatLng($scope.activeMarker.latitude, $scope.activeMarker.longitude)
          };

          $scope.directionsMap = new maps.Map(document.getElementById('directions-map'), mapOptions);
          $scope.directionsCenterMarker = new maps.Marker({
            position: mapOptions.center,
            map: $scope.directionsMap,
          });

        } else {
          // als map wel al bestaat: center aanpassen aan nieuwe marker
          centerDirectionsMapOnMarker(marker);
        }

        // als adres is ingevuld: directions aanpassen
        if ($scope.startAdres) {
          $scope.showDirections();
        } else { 
          clearDirections();
        }
      };

      $('.marker-info-close').click(function(event) {
        event.preventDefault();
        $('.marker-info').hide();
      });


      // Directions
      // ============================= //

      function clearDirections (error) {

        directionsPanel.innerHTML = '';
        directionsDisplay.setMap(null);
        $scope.printButton = false;

        if (error === 'ongeldig') {
          directionsPanel.innerHTML = '<div class="direction-error">Het ingevoerde startadres is niet geldig of werd niet gevonden.</div>';
        } else if (error === 'invoer') {
          directionsPanel.innerHTML = '<div class="direction-error">Je hebt nog geen startadres ingevoerd.</div>';
        }        
      }

      $scope.showDirections = function () {
        if ($scope.startAdres) {       
          var request = {
            origin: $scope.startAdres,
            destination: $scope.activeMarker.adres,
            travelMode: maps.TravelMode.TRANSIT
          };

          directionsPanel.innerHTML = '';

          directionsDisplay.setPanel(directionsPanel);         
          directionsDisplay.setMap($scope.directionsMap);
          $scope.printButton = true;

          directionsService.route(request, function(response, status) {
            if (status === maps.DirectionsStatus.OK) {
              directionsDisplay.setDirections(response);        
            } else {
              clearDirections('ongeldig'); // ongeldige invoer
              }
          });
        } else {
          clearDirections('invoer'); // geen invoer
        }
      };

      $scope.printDirections = function () {
        var print = document.getElementById('directions-panel').cloneNode(true);
        var newWindow = window.open('','Ratting','width=1000,height=550,0,status=0,resizable=1');
        newWindow.document.getElementsByTagName('body')[0].appendChild(print);
        newWindow.print();
      };


      // Filter op categorie & zoekterm (filteredMarkers, categorieIncludes)
      // ============================= //

      $scope.filterAllMarkers = function() {


        // ====== 1. Moet er gefiltert worden? ======

        // als geen zoekopdracht (geen catergorie en geen zoekterm) 
        // => alle markers weergeven
        if ($scope.categorieIncludes[1] === undefined && ($scope.zoekQuery === undefined || $scope.zoekQuery === '')) {
          $scope.filteredMarkers = $scope.markerList;
          updateAllMarkers();
          return;
        }

        $scope.filteredMarkers = [];


        // ====== 2. Filteren op categorie ======

        // als geen categorie is geselecteerd, dan alle markers doorgeven aan
        // volgende filter
        if ($scope.categorieIncludes[1] === undefined) {
          $scope.filteredMarkers = $scope.markerList;
        } else { 
          // als wel categories geselecteerd, dan filteredMarkers 
          // voor de eerste keer filteren
          for (var i = $scope.markerList.length - 1; i >= 0; i--) {
            var mark = $scope.markerList[i];

            if ($.inArray(mark.categorie, $scope.categorieIncludes) > 0) {
              $scope.filteredMarkers.push(mark);
            }
          }
        }


        // ====== 3. Filteren op zoekterm ======

        $scope.filteredMarkers = filterFilter($scope.filteredMarkers, $scope.zoekQuery);


        // ====== 4. Filters doorvoeren ======

        updateAllMarkers();

      };


      // include Categorie
      // ============================= //

      $scope.includeCategorie = function(cat) {
        var index = $scope.categorieIncludes.indexOf(cat);
        if (index > -1) { // wel in array => verwijderen
            $scope.categorieIncludes.splice(index, 1);
        } else { // niet in array => toevoegen
            $scope.categorieIncludes.push(cat);
        }
        $scope.filterAllMarkers();
      };


      // include Categorie
      // ============================= //

      $('.uitleg').click(function() {
        $('.categorie-checkboxen').slideToggle();
      });
      
     
      // InitApp
      // ============================= //

      function initApp () {
        // Markers declarations (extraMarkers, markerList)
        // ============================= //

        $scope.extraMarkers = [
          {
            id: 'home',
            latitude: 51.162915818477146, 
            longitude: 4.46370585193824,
            categorie: 'home',
            icon: 'app/images/home.png',
            website: 'www.ritmica.be/',
            organisatie: 'Ritmica',
            alinea1: '',
            alinea2: '',
            adres: 'Wouwstraat 44, 2540 Hove',
            mail: 'info@thuishaven-ritmica.be',
            tel: '03 460 38 40'
          }
        ];

        $scope.markerList = markers;


        // Map declaration (map, options)
        // ============================= //

        $scope.map = {
          center: { 
            latitude: 51.162915818477146, 
            longitude: 4.46370585193824
          }, 
          zoom: 12,
          control: {},
          events: {
            // idle: function () {
            //   mapIdle();
            // }
          }
        };

        $scope.options = {
          disableDefaultUI: true,
          zoomControl: true,
          zoomControlOptions: {
            style:maps.ZoomControlStyle.BIG
          }
          // mapTypeControl: true,
          // overviewMapControl: true,
          // streetViewControl: true
        };

        initAllMarkers();
        geoLocate();
      }

      initApp();

      var directionsDisplay = new maps.DirectionsRenderer();
      var directionsService = new maps.DirectionsService();
      var directionsPanel = document.getElementById('directions-panel');
      $scope.printButton = false;

      $('.categorie-checkboxen').hide();

      $scope.filteredMarkers = filterFilter($scope.filteredMarkers, $scope.zoekQuery);
    });
  });




















  

      // Dichtbij -center / -Current Position
      // ============================= //

      // $scope.dichtbijCenter = function () {
      //   // afstand tot center berekenen van alle markers
      //   for (var i = $scope.markerList.length - 1; i >= 0; i--) {
      //     var marker = $scope.markerList[i];
      //     var markerLatLong = new maps.LatLng(marker.latitude, marker.longitude);
      //     var centerLatLong = new maps.LatLng($scope.map.center.latitude, $scope.map.center.longitude);
      //     var dist = maps.geometry.spherical.computeDistanceBetween(markerLatLong, centerLatLong);  

      //     $scope.markerList[i].centerDist = dist;
      //   }
      // };      

      // $scope.dichtbijCurrentPosition = function () {
      //   // afstand tot center berekenen van alle markers

      //   if ($scope.currentLocation) {
      //     for (var i = $scope.markerList.length - 1; i >= 0; i--) {
      //       var marker = $scope.markerList[i];
      //       var markerLatLong = new maps.LatLng(marker.latitude, marker.longitude);
      //       var refLatLong = new maps.LatLng($scope.currentLocation.latitude, $scope.currentLocation.longitude);
      //       var dist = maps.geometry.spherical.computeDistanceBetween(markerLatLong, refLatLong);  

      //       $scope.markerList[i].centerDist = dist;
      //     } 
      //   } else {
      //     //alert:('Huidige locatie is onbepaald');
      //   }
      // };


      // Pop-ups show / hide
      // ============================= //

      // $scope.showMarker = function (marker) {
      //   marker.show = true;
      // };      

      // $scope.hideMarker = function (marker) {
      //   marker.show = false;
      // };


      // Map Idle
      // ============================= //

      // var mapIdle = function () {
      //   // var map = $scope.map.control.getGMap();
      //   // var mapBounds = map.getBounds();
      //   // $scope.inBoundsArray = [];
      //   // $scope.outBoundsArray = [];

      //   // for (var i = $scope.markerList.length - 1; i >= 0; i--) {
      //   //   var marker = $scope.markerList[i];
      //   //   var latLong = new maps.LatLng(marker.latitude, marker.longitude);

      //   //   if (mapBounds.contains(latLong)) {
      //   //     $scope.inBoundsArray.push(marker);
      //   //   } else {
      //   //     $scope.outBoundsArray.push(marker);
      //   //   }
      //   // } 
      //   // console.log($scope.inBoundsArray);
      // };


      // $('.toon-op-kaart').click(function(event) {
      //   event.preventDefault();
      //   $('.marker-info').hide();
      //   $scope.map.zoom = 18;
      //   $scope.map.center = {
      //     latitude: $scope.activeMarker.latitude, 
      //     longitude: $scope.activeMarker.longitude
      //   };
      // });
