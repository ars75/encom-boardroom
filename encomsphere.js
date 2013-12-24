
;ENCOM = (function(){

    /* encom fucntions */

    var extend = function(first, second) {
        for(var i in first){
            second[i] = first[i];
        }
    };

    var waitForAll = function(waits, cb){
        this.waitfor_count = waits.length;

        var finished = function(){
            this.waitfor_count--;
            if(!this.waitfor_count){
                cb();
            }
        }

        for(var i = 0; i< waits.length; i++){
            waits[i](finished);
        }
    };


    /* globe */

    /* private globe function */

    var globe_latLonToXY = function(width, height, lat,lon){

        var x = Math.floor(width/2.0 + (width/360.0)*lon);
        var y = Math.floor(height - (height/2.0 + (height/180.0)*lat));

        return {x: x, y:y};
    };

    var globe_isPixelBlack = function(context, x, y){
        return context.getImageData(x,y,1,1).data[0] === 0;
    };

    var globe_samplePoints = function(projectionContext, width, height, latoffset, lonoffset, latinc, loninc, cb){
        var points = [];
        for(var lat = 90-latoffset; lat > -90; lat -= latinc){
            for(var lon = -180+lonoffset; lon < 180; lon += loninc){
                var point = globe_latLonToXY(width, height, lat, lon);
                if(globe_isPixelBlack(projectionContext,point.x, point.y)){
                    cb({lat: lat, lon: lon});
                    points.push({lat: lat, lon: lon});
                }
            }
        }
        return points;
    };

    var globe_mapPoint = function(lat, lng, scale) {
       if(!scale){
           scale = 500;
       }
       var phi = (90 - lat) * Math.PI / 180;
       var theta = (180 - lng) * Math.PI / 180;
       var x = scale * Math.sin(phi) * Math.cos(theta);
       var y = scale * Math.cos(phi);
       var z = scale * Math.sin(phi) * Math.sin(theta);
       return {x: x, y: y, z:z};
     }

    var globe_addPointAnimation = function(when, verticleIndex, position){
        var pCount = this.globe_pointAnimations.length-1;
        while(pCount > 0 && this.globe_pointAnimations[pCount].when < when){
            pCount--;
        }
        this.globe_pointAnimations.splice(pCount+1,0, {when: when, verticleIndex: verticleIndex, position: position});
    };

    var globe_runPointAnimations = function(){
        var next;
        if(!this.firstRunTime){
            this.firstRunTime = Date.now();
        }

        if(this.globe_pointAnimations.length == 0){
            return;
        }

        while(this.globe_pointAnimations.length > 0 && this.firstRunTime + (next = this.globe_pointAnimations.pop()).when < Date.now()){
            this.globe_particles.geometry.vertices[next.verticleIndex].x = next.position.x;
            this.globe_particles.geometry.vertices[next.verticleIndex].y = next.position.y;
            this.globe_particles.geometry.vertices[next.verticleIndex].z = next.position.z;

            this.globe_particles.geometry.verticesNeedUpdate = true;
        }
        if(this.firstRunTime + next.when >= Date.now()){
            this.globe_pointAnimations.push(next);
        }

    };

    var globe_createLabel = function(text, x, y, z, size, color, backGroundColor, backgroundMargin) {
        if(!backgroundMargin)
            backgroundMargin = 50;

        var canvas = document.createElement("canvas");

        var context = canvas.getContext("2d");
        context.font = size + "pt Arial";

        var textWidth = context.measureText(text).width;

        canvas.width = textWidth;
        canvas.height = size;
        context = canvas.getContext("2d");
        context.font = size + "pt Arial";

        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillStyle = color;
        context.fillText(text, canvas.width / 2, canvas.height / 2);

        // context.strokeStyle = "black";
        // context.strokeRect(0, 0, canvas.width, canvas.height);

        var texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;

        var material = new THREE.SpriteMaterial({
            map : texture,
            useScreenCoordinates: false,
            opacity:0
            
            });
        var sprite = new THREE.Sprite(material);
        sprite.position = {x: x*1.1, y: y+20, z: z*1.1};
        sprite.scale.set(canvas.width, canvas.height);
            new TWEEN.Tween( {opacity: 0})
                .to( {opacity: 1}, 500 )
                .onUpdate(function(){
                    material.opacity = this.opacity
                }).delay(1000)
                .start();

        return sprite;

    }

    var globe_mainParticles = function(){

        var material, geometry;

        var colors = [];

        var sprite = THREE.ImageUtils.loadTexture( "hex2.png" );
        var myColors1 = pusher.color('orange').hueSet();
        var myColors = [];
        for(var i = 0; i< myColors1.length; i++){
            myColors.push(myColors1[i]);

            myColors.push(myColors1[i].shade(.2 + Math.random()/2.0));
            myColors.push(myColors1[i].shade(.2 + Math.random()/2.0));
        }
        var geometry = new THREE.Geometry();

        for ( i = 0; i < this.points.length; i ++ ) {
            

            var vertex = new THREE.Vector3();
            var point = globe_mapPoint(this.points[i].lat, this.points[i].lon, 500);
            var delay = this.swirlTime*((180+this.points[i].lon)/360.0); 

            vertex.x = 0;
            vertex.y = 0;
            vertex.z = this.cameraDistance+1;

            geometry.vertices.push( vertex );

            globe_addPointAnimation.call(this,delay, i, {
                x : point.x*this.swirlMultiplier,
                y : point.y*this.swirlMultiplier,
                z : point.z*this.swirlMultiplier});

            globe_addPointAnimation.call(this,delay + 500, i, {
                x : point.x,
                y : point.y,
                z : point.z});

            colors[i] = new THREE.Color( myColors[Math.floor(Math.random() * myColors.length)].hex6());


        }

        geometry.colors = colors;

        material = new THREE.ParticleSystemMaterial( { size: 8 + Math.random()*10, map: sprite, vertexColors: true, transparent: true } );

        this.globe_particles = new THREE.ParticleSystem( geometry, material );
        this.globe_particles.sortParticles = true;
        this.globe_particles.geometry.dynamic=true;


        this.scene.add( this.globe_particles );

    };


    var globe_swirls = function(){
        var geometrySpline,
            materialSpline = new THREE.LineBasicMaterial({
            color: 0x8FD8D8,
            transparent: true,
            linewidth: 2,
            opacity: 1
        });
        var sPoint;
        var _this = this;

        new TWEEN.Tween( {opacity: 1})
            .to( {opacity: 0}, 500 )
            .delay(this.swirlTime-500)
            .onUpdate(function(){
                materialSpline.opacity = this.opacity;

            })
            .start();

        setTimeout(function(){
            _this.scene.remove(_this.swirl);
        }, this.swirlTime);


        for(var i = 0; i<75; i++){
            geometrySpline = new THREE.Geometry();

            var lat = Math.random()*180 + 90;
            var lon =  Math.random()*5;
            var lenBase = 4 + Math.floor(Math.random()*5);

            if(Math.random()<.3){
                lon = Math.random()*30 - 50;
                lenBase = 3 + Math.floor(Math.random()*3);
            }

            for(var j = 0; j< lenBase; j++){
                var thisPoint = globe_mapPoint(lat, lon - j * 5);
                sPoint = new THREE.Vector3(thisPoint.x*this.swirlMultiplier, thisPoint.y*this.swirlMultiplier, thisPoint.z*this.swirlMultiplier);

                geometrySpline.vertices.push(sPoint);  
            }

            this.swirl.add(new THREE.Line(geometrySpline, materialSpline));
            
        }
        this.scene.add(this.swirl);
    };

    /* globe constructor */

    function globe(opts){

        if(!opts){
            opts = {};
        }

        var defaults = {
            mapUrl: "equirectangle_projection.png",
            size: 100,
            width: document.width,
            height: document.height,
            swirlMultiplier: 1.20,
            swirlTime: 3500,
            cameraDistance: 2000,
            samples: [
                { 
                    offsetLat: 0,
                    offsetLon: 0,
                    incLat: 2,
                    incLon: 4
                },
                { 
                    offsetLat: 1,
                    offsetLon: 2,
                    incLat: 2,
                    incLon: 4
                }
                ],
            points: [],
            globe_pointAnimations: [],
            swirl: new THREE.Object3D()
            
        };

        extend(opts, defaults);

        for(var i in defaults){
            if(!this[i]){
                this[i] = defaults[i];
            }
        }

    }

    /* public globe functions */

    globe.prototype.init = function(cb){
        var  projectionContext,
            img = document.createElement('img'),
            projectionCanvas = document.createElement('canvas'),
            self = this;
            
        document.body.appendChild(projectionCanvas);
        projectionContext = projectionCanvas.getContext('2d');

        this.markerTopTexture = new THREE.ImageUtils.loadTexture( 'markertop.png' );

        img.addEventListener('load', function(){
            //image has loaded, may rsume
            projectionCanvas.width = img.width;
            projectionCanvas.height = img.height;
            projectionContext.drawImage(img, 0, 0, img.width, img.height);
            for (var i = 0; i< self.samples.length; i++){
                
                globe_samplePoints(projectionContext,img.width, img.height, self.samples[i].offsetLat, self.samples[i].offsetLon, self.samples[i].incLat, self.samples[i].incLon, function(point){
                    self.points.push(point);
                });
            }
            document.body.removeChild(projectionCanvas);


            // create the webgl context, renderer and camera
            if(self.containerId){
                self.container = document.getElementById(self.containerId);
                self.width = self.container.width;
                self.height = self.container.height;
            } else {
                self.container = document.createElement( 'div' );
                self.container.width = self.width;
                self.container.height = self.height;
            }

            document.body.appendChild( self.container );

            self.renderer = new THREE.WebGLRenderer( { clearAlpha: 1 } );
            self.renderer.setSize( self.width, self.height);
            self.container.appendChild( self.renderer.domElement );

            // create the camera

            self.camera = new THREE.PerspectiveCamera( 50, self.width / self.height, 1, 3000 );
            self.camera.position.z = this.cameraDistance;
            self.cameraAngle=(Math.PI * 2) * .5;

            // create the scene

            self.scene = new THREE.Scene();
            self.scene.fog = new THREE.Fog( 0x000000, self.cameraDistance-200, self.cameraDistance+550 );

            // create the stats thing
            
            if(Stats){
                self.stats = new Stats();
                self.stats.domElement.style.position = 'absolute';
                self.stats.domElement.style.top = '0px';
                self.container.appendChild( self.stats.domElement );
            }

            // add the globe particles
            
            globe_mainParticles.call(self);
            globe_swirls.call(self);

            if(cb){
                cb();
            }
        });


        img.src = this.mapUrl;
    }

    globe.prototype.addMarker = function(lat, lng, text){

        var point = globe_mapPoint(lat,lng);
        var markerGeometry = new THREE.Geometry();
        var markerMaterial = new THREE.LineBasicMaterial({
            color: 0x8FD8D8,
            });
        var _this = this;

        markerGeometry.vertices.push(new THREE.Vector3(point.x, point.y, point.z));
        markerGeometry.vertices.push(new THREE.Vector3(point.x, point.y, point.z));

        var line = new THREE.Line(markerGeometry, markerMaterial);


        var textSprite = globe_createLabel(text, point.x*1.2, point.y*1.2, point.z*1.2, 20, "white");
        // textMesh.rotateY(Math.PI/2 - cameraAngle);

        this.scene.add(line);
        this.scene.add(textSprite);

        new TWEEN.Tween(point)
            .to( {x: point.x*1.2, y: point.y*1.2, z: point.z*1.2}, 1500 )
            .easing( TWEEN.Easing.Elastic.InOut )
            .onUpdate(function(){
                markerGeometry.vertices[1].x = this.x;
                markerGeometry.vertices[1].y = this.y;
                markerGeometry.vertices[1].z = this.z;
                markerGeometry.verticesNeedUpdate = true;
            })
            .onComplete(function(){
                var markerMaterial = new THREE.SpriteMaterial({map: _this.markerTopTexture, color: 0xFD7D8});
                var markerTop = new THREE.Sprite(markerMaterial);
                markerTop.position.set(point.x, point.y, point.z);
                markerTop.scale.set(15, 15);
                _this.scene.add(markerTop);

            })
            .start();
    }

    globe.prototype.tick = function(){
        globe_runPointAnimations.call(this);
        TWEEN.update();

        if(this.stats){
            this.stats.update();
        }

        if(!this.lastRenderDate){
            this.lastRenderDate = new Date();
        }


        var renderTime = new Date() - this.lastRenderDate;
        this.lastRenderDate = new Date();
        var rotateCameraBy = (2 * Math.PI)/(20000/renderTime);

        this.cameraAngle += rotateCameraBy;

        this.camera.position.x = this.cameraDistance * Math.cos(this.cameraAngle);
        this.camera.position.y = 0;
        this.camera.position.z = this.cameraDistance * Math.sin(this.cameraAngle);


        this.camera.lookAt( this.scene.position );

        this.swirl.rotateY((2 * Math.PI)/(this.swirlTime/renderTime));
        this.renderer.render( this.scene, this.camera );

    }

    

    /*
    var landPoints = function(img, samples, cb){

        // note:i don't think this is working because i need to wait for the document to finish loading
        var points = [];
        var loaded = false;

        var getPoints = function(){
            if(loaded){
                return;
            } 
            loaded = true;

            var globeCanvas = document.createElement('canvas');
            document.body.appendChild(globeCanvas);
            var globeContext = globeCanvas.getContext('2d');
            globeCanvas.width = img.width;
            globeCanvas.height = img.height;
            globeContext.drawImage(img, 0, 0, img.width, img.height);
            console.log(img.height);

            for (var i = 0; i< samples.length; i++){
                samplePoints(globeContext,img.width, img.height, samples[i].offsetLat, samples[i].offsetLon, samples[i].incLat, samples[i].incLon, function(point){
                    points.push(point);
                });
            }
            cb(points);
            document.body.removeChild(globeCanvas);
        };

        img.addEventListener('load', getPoints);
        // in case we alread finished loading the image
        if(img.complete){
            getPoints();
        }
        setTimeout(function(){
            console.log(img.complete);

        },1000);

    };
   */



    return {
        globe: globe,
        waitForAll: waitForAll
    };

})();
