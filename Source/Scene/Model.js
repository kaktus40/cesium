/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/RuntimeError',
        '../Core/Matrix4',
        '../Core/loadText',
        '../Core/loadArrayBuffer',
        '../Renderer/CommandLists',
        '../Renderer/DrawCommand',
        './SceneMode',
        '../ThirdParty/webgl-tf-loader'
    ], function(
        DeveloperError,
        RuntimeError,
        Matrix4,
        loadText,
        loadArrayBuffer,
        CommandLists,
        DrawCommand,
        SceneMode,
        webgl_tf_loader) {
    "use strict";

    // MODELS_TODO: This needs tests

    function destroyResources(resources) {
        var shaders = resources.shaders;

        for (var shader in shaders) {
            if (shaders.hasOwnProperty(shader)) {
                shader.release();
            }
        }
        resources.shaders = {};
    }

    var ModelLoader = Object.create(webgl_tf_loader, {
        handleBuffer: {
            value: function(entryID, description, userInfo) {
                loadArrayBuffer(description.path).then(function(arrayBuffer) {
                    var buffers = userInfo._resourcesToCreate.buffers;

                    if (typeof buffers[entryID] !== 'undefined') {
                        throw new RuntimeError('Duplicate buffer entryID:  ' + entryID);
                    }

                    buffers[entryID] = arrayBuffer;
                }, function() {
                    // MODEL_TODO: Instead of throwing Runtime errors, should we just warn and render with what we have?
                    throw new RuntimeError('Could not load buffer entryID, ' + entryID + ' from path ' + description.path);
                });

                return true;
            }
        },

        handleShader: {
            value: function(entryID, description, userInfo) {
                loadText(description.path).then(function(text) {
                    var shaders = userInfo._resourcesToCreate.shaders;

                    if (typeof shaders[entryID] !== 'undefined') {
                        throw new RuntimeError('Duplicate shader entryID:  ' + entryID);
                    }

                    shaders[entryID] = text;
                }, function() {
                    // MODEL_TODO: Instead of throwing Runtime errors, should we just warn and render with what we have?
                    throw new RuntimeError('Could not load shader entryID, ' + entryID + ' from path ' + description.path);
                });

                return true;
            }
        },

        handleTechnique: {
            value: function(entryID, description, userInfo) {
                console.log(entryID);
                return true;
            }
        },

        handleMaterial: {
            value: function(entryID, description, userInfo) {
                console.log(entryID);
                return true;
            }
        },

        handleLight: {
            value: function(entryID, description, userInfo) {
                // MODELS_TODO: Support light
                return true;
            }
        },

        handleMesh: {
            value: function(entryID, description, userInfo) {
                console.log(entryID);
                return true;
            }
        },

        handleCamera: {
            value: function(entryID, description, userInfo) {
                // MODELS_TODO: Support camera
                return true;
            }
        },

        handleScene: {
            value: function(entryID, description, userInfo) {
                console.log(entryID);
                return true;
            }
        },

        handleNode: {
            value: function(entryID, description, userInfo) {
                console.log(entryID);
                return true;
            }
        }
    });

    /**
     * DOC_TBA
     *
     * @alias Model
     * @constructor
     */
    var Model = function(url) {
        /**
         * The 4x4 transformation matrix that transforms the model from model to world coordinates.
         * When this is the identity matrix, the model is drawn in world coordinates, i.e., Earth's WGS84 coordinates.
         * Local reference frames can be used by providing a different transformation matrix, like that returned
         * by {@link Transforms.eastNorthUpToFixedFrame}.  This matrix is available to GLSL vertex and fragment
         * shaders via {@link czm_model} and derived uniforms.
         * <p>
         * The default is {@link Matrix4.IDENTITY}.
         * </p>
         *
         * @type Matrix4
         *
         * @example
         * var origin = ellipsoid.cartographicToCartesian(
         *   Cartographic.fromDegrees(-95.0, 40.0, 200000.0));
         * m.modelMatrix = Transforms.eastNorthUpToFixedFrame(origin);
         *
         * @see Transforms.eastNorthUpToFixedFrame
         * @see czm_model
         */
        this.modelMatrix = Matrix4.IDENTITY.clone();
        this._computedModelMatrix = Matrix4.IDENTITY.clone();

        /**
         * Determines if the model primitive will be shown.
         * <p>
         * The default is <code>true</code>.
         * </p>
         *
         * @type Boolean
         */
        this.show = true;

        // new DrawCommand();
        this._colorCommands = [];
        this._commandLists = new CommandLists();

        this._resourcesToCreate = {
            buffers : {
            },
            shaders : {
            }
        };
        this._resources = {
            shaders : {
            }
        };

        if (typeof url !== 'undefined') {
            this.load(url);
        }
    };

    /**
     * DOC_TBA
     *
     * @exception {DeveloperError} url is required.
     */
    Model.prototype.load = function(url) {
        if (typeof url === 'undefined') {
            throw new DeveloperError('url is required');
        }

        this._resourcesToCreate.buffers = {};
        this._resourcesToCreate.shaders = {};
        destroyResources(this._resources);

        var modelLoader = Object.create(ModelLoader);
        modelLoader.initWithPath(url);
        modelLoader.load(this);
    };

    /**
     * @private
     *
     * @exception {DeveloperError} this.material must be defined.
     */
    Model.prototype.update = function(context, frameState, commandList) {
        if (!this.show ||
            (frameState.mode !== SceneMode.SCENE3D)) {
            return;
        }

        var modelCommandLists = this._commandLists;
        modelCommandLists.removeAll();

        if (frameState.passes.color) {
            modelCommandLists.colorList = this._colorCommands;
        }

        commandList.push(modelCommandLists);
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @memberof Model
     *
     * @return {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
     *
     * @see Model#destroy
     */
    Model.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
     * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
     * <br /><br />
     * Once an object is destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
     * assign the return value (<code>undefined</code>) to the object as done in the example.
     *
     * @memberof Model
     *
     * @return {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see Model#isDestroyed
     *
     * @example
     * e = e && e.destroy();
     */
    Model.prototype.destroy = function() {
        destroyResources(this._resources);
        return destroyObject(this);
    };

    return Model;
});