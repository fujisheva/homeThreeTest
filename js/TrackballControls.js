/**
 * @author Eberhard Graether / http://egraether.com/
 */

THREE.TrackballControls = function ( object, domElement ) {

    var _this = this;
    var STATE = { NONE: -1, ROTATE: 0, ZOOM: 1, PAN: 2, TOUCH_ROTATE: 3, TOUCH_ZOOM: 4, TOUCH_PAN: 5 };

    this.object = object;
    this.domElement = ( domElement !== undefined ) ? domElement : document;

    // API

    this.enabled = true;

    this.screen = { width: 0, height: 0, offsetLeft: 0, offsetTop: 0 };
    this.radius = ( this.screen.width + this.screen.height ) / 4;

    this.rotateSpeed = 1.0;
    this.zoomSpeed = 1.2;
    this.panSpeed = 0.3;

    this.noRotate = false;
    this.noZoom = false;
    this.noPan = false;

    this.staticMoving = false;
    this.dynamicDampingFactor = 0.2;

    this.minDistance = 0;
    this.maxDistance = Infinity;

    this.keys = [ 65 /*A*/, 83 /*S*/, 68 /*D*/ ];

    // internals

    this.target = new THREE.Vector3();

    var lastPosition = new THREE.Vector3();

    var _state = STATE.NONE,
        _prevState = STATE.NONE,

        _eye = new THREE.Vector3(),

        _rotateStart = new THREE.Vector3(),
        _rotateEnd = new THREE.Vector3(),

        _zoomStart = new THREE.Vector2(),
        _zoomEnd = new THREE.Vector2(),

        _touchZoomDistanceStart = 0,
        _touchZoomDistanceEnd = 0,

        _panStart = new THREE.Vector2(),
        _panEnd = new THREE.Vector2();

    // for reset

    this.target0 = this.target.clone();
    this.position0 = this.object.position.clone();
    this.up0 = this.object.up.clone();

    // events

    var changeEvent = { type: 'change' };


    // methods
    this.handleResize = function () {

        this.screen.width = window.innerWidth;
        this.screen.height = window.innerHeight;

        this.screen.offsetLeft = 0;
        this.screen.offsetTop = 0;

        this.radius = ( this.screen.width + this.screen.height ) / 4;

    };

    this.handleEvent = function ( event ) {
        if ( typeof this[ event.type ] == 'function' ) {
            this[ event.type ]( event );
        }
    };

    this.getMouseOnScreen = function ( clientX, clientY ) {

        return new THREE.Vector2(
                ( clientX - _this.screen.offsetLeft ) / _this.radius * 0.5,
                ( clientY - _this.screen.offsetTop ) / _this.radius * 0.5
        );

    };

    this.getMouseProjectionOnBall = function ( clientX, clientY ) {
        var mouseOnBall = new THREE.Vector3(
                ( clientX - _this.screen.width * 0.5 - _this.screen.offsetLeft ) / _this.radius,
                ( _this.screen.height * 0.5 + _this.screen.offsetTop - clientY ) / _this.radius,
            0.0
        );

        var length = mouseOnBall.length();
        if ( length > 1.0 ) {
            mouseOnBall.normalize();
        } else {
            mouseOnBall.z = Math.sqrt( 1.0 - length * length );
        }

        _eye.copy( _this.object.position ).sub( _this.target );

        var projection = _this.object.up.clone().setLength( mouseOnBall.y );
        projection.add( _this.object.up.clone().cross( _eye ).setLength( mouseOnBall.x ) );
        projection.add( _eye.setLength( mouseOnBall.z ) );
        return projection;

    };

    this.rotateCamera = function () {
        var angle = Math.acos( _rotateStart.dot( _rotateEnd ) / _rotateStart.length() / _rotateEnd.length() );
        if ( angle ) {
            var axis = ( new THREE.Vector3() ).crossVectors( _rotateStart, _rotateEnd ).normalize(),
                quaternion = new THREE.Quaternion();

            angle *= _this.rotateSpeed;
            quaternion.setFromAxisAngle( axis, -angle);
            _eye.applyQuaternion( quaternion );
            _this.object.up.applyQuaternion( quaternion );

            _rotateEnd.applyQuaternion( quaternion );

            if ( _this.staticMoving ) {
                _rotateStart.copy( _rotateEnd );
            } else {
                quaternion.setFromAxisAngle( axis, angle * ( _this.dynamicDampingFactor - 1.0 ) );
                _rotateStart.applyQuaternion( quaternion );
            }

        }

    };

    this.zoomCamera = function () {

        if ( _state === STATE.TOUCH_ZOOM ) {

            var factor = _touchZoomDistanceStart / _touchZoomDistanceEnd;
            _touchZoomDistanceStart = _touchZoomDistanceEnd;
            _eye.multiplyScalar( factor );

        } else {

            var factor = 1.0 + ( _zoomEnd.y - _zoomStart.y ) * _this.zoomSpeed;

            if ( factor !== 1.0 && factor > 0.0 ) {

                _eye.multiplyScalar( factor );

                if ( _this.staticMoving ) {

                    _zoomStart.copy( _zoomEnd );

                } else {
                    _zoomStart.y += ( _zoomEnd.y - _zoomStart.y ) * this.dynamicDampingFactor;
                }
            }
        }
    };

    this.panCamera = function () {
        var mouseChange = _panEnd.clone().sub( _panStart );
        if ( mouseChange.lengthSq() ) {
            mouseChange.multiplyScalar( _eye.length() * _this.panSpeed );
            var pan = _eye.clone().cross( _this.object.up ).setLength( mouseChange.x );
            pan.add( _this.object.up.clone().setLength( mouseChange.y ) );

            _this.object.position.add( pan );
            _this.target.add( pan );

            if ( _this.staticMoving ) {
                _panStart = _panEnd;

            } else {
                _panStart.add( mouseChange.subVectors( _panEnd, _panStart ).multiplyScalar( _this.dynamicDampingFactor ) );

            }
        }

    };

    this.checkDistances = function () {
        if ( !_this.noZoom || !_this.noPan ) {
            if ( _this.object.position.lengthSq() > _this.maxDistance * _this.maxDistance ) {
                _this.object.position.setLength( _this.maxDistance );
            }
            if ( _eye.lengthSq() < _this.minDistance * _this.minDistance ) {
                _this.object.position.addVectors( _this.target, _eye.setLength( _this.minDistance ) );
            }
        }
    };

    this.update = function () {
        _eye.subVectors( _this.object.position, _this.target );
        if ( !_this.noRotate ) {
            _this.rotateCamera();
        }
        if ( !_this.noZoom ) {
            _this.zoomCamera();
        }
        if ( !_this.noPan ) {
            _this.panCamera();
        }
        _this.object.position.addVectors( _this.target, _eye );
        _this.checkDistances();
        _this.object.lookAt( _this.target );
        if ( lastPosition.distanceToSquared( _this.object.position ) > 0 ) {
            _this.dispatchEvent( changeEvent );
            lastPosition.copy( _this.object.position );
        }
    };

    this.reset = function () {
        _state = STATE.NONE;
        _prevState = STATE.NONE;

        _this.target.copy( _this.target0 );
        _this.object.position.copy( _this.position0 );
        _this.object.up.copy( _this.up0 );

        _eye.subVectors( _this.object.position, _this.target );

        _this.object.lookAt( _this.target );

        _this.dispatchEvent( changeEvent );
        lastPosition.copy( _this.object.position );

    };

    //autoRun
    this.originalX = 400;
    this.startX = this.originalX;
    this.orignialY = 500;
    this.startY = this.orignialY;
    this.moveParam = 20;
    this.rotateInterval =null;
    this.startRotate = function(){
        _rotateStart = _rotateEnd = _this.getMouseProjectionOnBall( _this.startX, _this.startY );
        _this.rotateInterval = setInterval(function(){
            _this.rotateMove();
        },50);
    };
    this.rotateMove = function(){
        if( _this.startX >= window.innerWidth) _this.moveParam = -30;
        if( _this.startX <= _this.originalX) _this.moveParam = 30;
        _this.startX += _this.moveParam;
        _rotateEnd = _this.getMouseProjectionOnBall(_this.startX, _this.startY);
    };

    this.stopRotate = function(){
        clearInterval(_this.rotateInterval);
        var _args = [].slice.call(arguments,1);
        arguments[0].apply(null,_args);
    };

    this.handleResize();

};

THREE.TrackballControls.prototype = Object.create( THREE.EventDispatcher.prototype );

