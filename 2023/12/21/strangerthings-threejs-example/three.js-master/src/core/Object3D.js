import {
  Quaternion
} from '../math/Quaternion.js';
import {
  Vector3
} from '../math/Vector3.js';
import {
  Matrix4
} from '../math/Matrix4.js';
import {
  EventDispatcher
} from './EventDispatcher.js';
import {
  Euler
} from '../math/Euler.js';
import {
  Layers
} from './Layers.js';
import {
  Matrix3
} from '../math/Matrix3.js';
import {
  _Math
} from '../math/Math.js';

/**
 * @author mrdoob / http://mrdoob.com/
 * @author mikael emtinger / http://gomo.se/
 * @author alteredq / http://alteredqualia.com/
 * @author WestLangley / http://github.com/WestLangley
 * @author elephantatwork / www.elephantatwork.ch
 */
//局部的全局变量
var object3DId = 0;

function Object3D() {
  // 每次执行该构造函数创建对象的时候，都会给该对象设置一个id属性，并且他一个全局变量加1赋值给id属性
  Object.defineProperty(this, 'id', {
    value: object3DId++
  });
  // generate :生成
  this.uuid = _Math.generateUUID();

  this.name = '';
  this.type = 'Object3D';

  this.parent = null;
  this.children = [];

  this.up = Object3D.DefaultUp.clone();

  var position = new Vector3();
  var rotation = new Euler();
  var quaternion = new Quaternion();
  var scale = new Vector3(1, 1, 1);

  function onRotationChange() {

    quaternion.setFromEuler(rotation, false);

  }

  function onQuaternionChange() {

    rotation.setFromQuaternion(quaternion, undefined, false);

  }

  rotation.onChange(onRotationChange);
  quaternion.onChange(onQuaternionChange);

  Object.defineProperties(this, {
    position: {
      enumerable: true,
      value: position
    },
    rotation: {
      enumerable: true,
      value: rotation
    },
    quaternion: {
      enumerable: true,
      value: quaternion
    },
    scale: {
      enumerable: true,
      value: scale
    },
    modelViewMatrix: {
      value: new Matrix4()
    },
    normalMatrix: {
      value: new Matrix3()
    }
  });

  this.matrix = new Matrix4();
  this.matrixWorld = new Matrix4();

  this.matrixAutoUpdate = Object3D.DefaultMatrixAutoUpdate;
  this.matrixWorldNeedsUpdate = false;
  // 创建obj3对象的时候，已经默认创建Layers，并且带对象创建的时候默认相当于初始化执行set(0)
  this.layers = new Layers();
  this.visible = true;

  this.castShadow = false;
  this.receiveShadow = false;

  this.frustumCulled = true;
  this.renderOrder = 0;

  this.userData = {};

}

Object3D.DefaultUp = new Vector3(0, 1, 0);
Object3D.DefaultMatrixAutoUpdate = true;

Object3D.prototype = Object.assign(Object.create(EventDispatcher.prototype), {

  constructor: Object3D,

  isObject3D: true,

  onBeforeRender: function() {},
  onAfterRender: function() {},

  applyMatrix: function(matrix) {

    this.matrix.multiplyMatrices(matrix, this.matrix);

    this.matrix.decompose(this.position, this.quaternion, this.scale);

  },

  applyQuaternion: function(q) {

    this.quaternion.premultiply(q);

    return this;

  },

  setRotationFromAxisAngle: function(axis, angle) {

    // assumes axis is normalized

    this.quaternion.setFromAxisAngle(axis, angle);

  },

  setRotationFromEuler: function(euler) {

    this.quaternion.setFromEuler(euler, true);

  },

  setRotationFromMatrix: function(m) {

    // assumes the upper 3x3 of m is a pure rotation matrix (i.e, unscaled)

    this.quaternion.setFromRotationMatrix(m);

  },

  setRotationFromQuaternion: function(q) {

    // assumes q is normalized

    this.quaternion.copy(q);

  },

  rotateOnAxis: function() {

    // rotate object on axis in object space
    // axis is assumed to be normalized

    var q1 = new Quaternion();

    return function rotateOnAxis(axis, angle) {

      q1.setFromAxisAngle(axis, angle);

      this.quaternion.multiply(q1);

      return this;

    };

  }(),

  rotateOnWorldAxis: function() {

    // rotate object on axis in world space
    // axis is assumed to be normalized
    // method assumes no rotated parent

    var q1 = new Quaternion();

    return function rotateOnWorldAxis(axis, angle) {

      q1.setFromAxisAngle(axis, angle);

      this.quaternion.premultiply(q1);

      return this;

    };

  }(),

  rotateX: function() {

    var v1 = new Vector3(1, 0, 0);

    return function rotateX(angle) {

      return this.rotateOnAxis(v1, angle);

    };

  }(),

  rotateY: function() {

    var v1 = new Vector3(0, 1, 0);

    return function rotateY(angle) {

      return this.rotateOnAxis(v1, angle);

    };

  }(),

  rotateZ: function() {

    var v1 = new Vector3(0, 0, 1);

    return function rotateZ(angle) {

      return this.rotateOnAxis(v1, angle);

    };

  }(),

  translateOnAxis: function() {

    // translate object by distance along axis in object space
    // axis is assumed to be normalized

    var v1 = new Vector3();

    return function translateOnAxis(axis, distance) {

      v1.copy(axis).applyQuaternion(this.quaternion);

      this.position.add(v1.multiplyScalar(distance));

      return this;

    };

  }(),

  translateX: function() {

    var v1 = new Vector3(1, 0, 0);

    return function translateX(distance) {

      return this.translateOnAxis(v1, distance);

    };

  }(),

  translateY: function() {

    var v1 = new Vector3(0, 1, 0);

    return function translateY(distance) {

      return this.translateOnAxis(v1, distance);

    };

  }(),

  translateZ: function() {

    var v1 = new Vector3(0, 0, 1);

    return function translateZ(distance) {

      return this.translateOnAxis(v1, distance);

    };

  }(),

  localToWorld: function(vector) {

    return vector.applyMatrix4(this.matrixWorld);

  },

  worldToLocal: function() {

    var m1 = new Matrix4();

    return function worldToLocal(vector) {

      return vector.applyMatrix4(m1.getInverse(this.matrixWorld));

    };

  }(),

  lookAt: function() {

    // This method does not support objects with rotated and/or translated parent(s)

    var m1 = new Matrix4();
    var vector = new Vector3();
    // 参数可以是一个向量，也可以是向量的三个分量
    return function lookAt(x, y, z) {
      // 判断x是不是向量v3，如果是，说明程序员使用的是三维向量
      if (x.isVector3) {

        vector.copy(x);

      } else {

        vector.set(x, y, z);

      }

      if (this.isCamera) {

        m1.lookAt(this.position, vector, this.up);

      } else {

        m1.lookAt(vector, this.position, this.up);

      }

      this.quaternion.setFromRotationMatrix(m1);

    };

  }(),

  add: function(object) {

    if (arguments.length > 1) {

      for (var i = 0; i < arguments.length; i++) {

        this.add(arguments[i]);

      }

      return this;

    }

    if (object === this) {

      console.error("THREE.Object3D.add: object can't be added as a child of itself.", object);
      return this;

    }

    if ((object && object.isObject3D)) {

      if (object.parent !== null) {

        object.parent.remove(object);

      }

      object.parent = this;
      object.dispatchEvent({
        type: 'added'
      });

      this.children.push(object);

    } else {

      console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.", object);

    }

    return this;

  },
  // 参数：.remove ( object : Object3D, ... )
  // 将对象作为对象的子对象移除。可以删除任意数量的对象。
  remove: function(object) {
    // arguments对象表示所有参数组成的数组
    if (arguments.length > 1) {
      // 循环遍历  每一个参数对象执行remove删除方法
      for (var i = 0; i < arguments.length; i++) {

        this.remove(arguments[i]);

      }

      return this;

    }
    // 获得object在children数组中的索引
    var index = this.children.indexOf(object);

    if (index !== -1) {
// 设置object的父对象属性parent为null空
      object.parent = null;

      object.dispatchEvent({
        type: 'removed'
      });
// 删除children数组中索引是index的元素
      this.children.splice(index, 1);

    }

    return this;

  },
  // 通过id获得对象
  getObjectById: function(id) {
    // 浏览器通过id选择的生层原理
    return this.getObjectByProperty('id', id);

  },

  getObjectByName: function(name) {

    return this.getObjectByProperty('name', name);

  },

  getObjectByProperty: function(name, value) {

    if (this[name] === value) return this;

    for (var i = 0, l = this.children.length; i < l; i++) {

      var child = this.children[i];
      var object = child.getObjectByProperty(name, value);

      if (object !== undefined) {

        return object;

      }

    }

    return undefined;

  },

  getWorldPosition: function(target) {

    if (target === undefined) {

      console.warn('THREE.Object3D: .getWorldPosition() target is now required');
      target = new Vector3();

    }

    this.updateMatrixWorld(true);

    return target.setFromMatrixPosition(this.matrixWorld);

  },

  getWorldQuaternion: function() {

    var position = new Vector3();
    var scale = new Vector3();

    return function getWorldQuaternion(target) {

      if (target === undefined) {

        console.warn('THREE.Object3D: .getWorldQuaternion() target is now required');
        target = new Quaternion();

      }

      this.updateMatrixWorld(true);

      this.matrixWorld.decompose(position, target, scale);

      return target;

    };

  }(),

  getWorldScale: function() {

    var position = new Vector3();
    var quaternion = new Quaternion();

    return function getWorldScale(target) {

      if (target === undefined) {

        console.warn('THREE.Object3D: .getWorldScale() target is now required');
        target = new Vector3();

      }

      this.updateMatrixWorld(true);

      this.matrixWorld.decompose(position, quaternion, target);

      return target;

    };

  }(),

  getWorldDirection: function() {

    var quaternion = new Quaternion();

    return function getWorldDirection(target) {

      if (target === undefined) {

        console.warn('THREE.Object3D: .getWorldDirection() target is now required');
        target = new Vector3();

      }

      this.getWorldQuaternion(quaternion);

      return target.set(0, 0, 1).applyQuaternion(quaternion);

    };

  }(),

  raycast: function() {},

  traverse: function(callback) {

    callback(this);

    var children = this.children;

    for (var i = 0, l = children.length; i < l; i++) {

      children[i].traverse(callback);

    }

  },

  traverseVisible: function(callback) {

    if (this.visible === false) return;

    callback(this);

    var children = this.children;

    for (var i = 0, l = children.length; i < l; i++) {

      children[i].traverseVisible(callback);

    }

  },

  traverseAncestors: function(callback) {

    var parent = this.parent;

    if (parent !== null) {

      callback(parent);

      parent.traverseAncestors(callback);

    }

  },

  updateMatrix: function() {

    this.matrix.compose(this.position, this.quaternion, this.scale);

    this.matrixWorldNeedsUpdate = true;

  },

  updateMatrixWorld: function(force) {

    if (this.matrixAutoUpdate) this.updateMatrix();

    if (this.matrixWorldNeedsUpdate || force) {

      if (this.parent === null) {

        this.matrixWorld.copy(this.matrix);

      } else {

        this.matrixWorld.multiplyMatrices(this.parent.matrixWorld, this.matrix);

      }

      this.matrixWorldNeedsUpdate = false;

      force = true;

    }

    // update children

    var children = this.children;

    for (var i = 0, l = children.length; i < l; i++) {

      children[i].updateMatrixWorld(force);

    }

  },

  toJSON: function(meta) {

    // meta is a string when called from JSON.stringify
    var isRootObject = (meta === undefined || typeof meta === 'string');

    var output = {};

    // meta is a hash used to collect geometries, materials.
    // not providing it implies that this is the root object
    // being serialized.
    if (isRootObject) {

      // initialize meta obj
      meta = {
        geometries: {},
        materials: {},
        textures: {},
        images: {},
        shapes: {}
      };

      output.metadata = {
        version: 4.5,
        type: 'Object',
        generator: 'Object3D.toJSON'
      };

    }

    // standard Object3D serialization

    var object = {};

    object.uuid = this.uuid;
    object.type = this.type;

    if (this.name !== '') object.name = this.name;
    if (this.castShadow === true) object.castShadow = true;
    if (this.receiveShadow === true) object.receiveShadow = true;
    if (this.visible === false) object.visible = false;
    if (this.frustumCulled === false) object.frustumCulled = false;
    if (this.renderOrder !== 0) object.renderOrder = this.renderOrder;
    if (JSON.stringify(this.userData) !== '{}') object.userData = this.userData;

    object.matrix = this.matrix.toArray();

    //

    function serialize(library, element) {

      if (library[element.uuid] === undefined) {

        library[element.uuid] = element.toJSON(meta);

      }

      return element.uuid;

    }

    if (this.geometry !== undefined) {

      object.geometry = serialize(meta.geometries, this.geometry);

      var parameters = this.geometry.parameters;

      if (parameters !== undefined && parameters.shapes !== undefined) {

        var shapes = parameters.shapes;

        if (Array.isArray(shapes)) {

          for (var i = 0, l = shapes.length; i < l; i++) {

            var shape = shapes[i];

            serialize(meta.shapes, shape);

          }

        } else {

          serialize(meta.shapes, shapes);

        }

      }

    }

    if (this.material !== undefined) {

      if (Array.isArray(this.material)) {

        var uuids = [];

        for (var i = 0, l = this.material.length; i < l; i++) {

          uuids.push(serialize(meta.materials, this.material[i]));

        }

        object.material = uuids;

      } else {

        object.material = serialize(meta.materials, this.material);

      }

    }

    //

    if (this.children.length > 0) {

      object.children = [];

      for (var i = 0; i < this.children.length; i++) {

        object.children.push(this.children[i].toJSON(meta).object);

      }

    }

    if (isRootObject) {

      var geometries = extractFromCache(meta.geometries);
      var materials = extractFromCache(meta.materials);
      var textures = extractFromCache(meta.textures);
      var images = extractFromCache(meta.images);
      var shapes = extractFromCache(meta.shapes);

      if (geometries.length > 0) output.geometries = geometries;
      if (materials.length > 0) output.materials = materials;
      if (textures.length > 0) output.textures = textures;
      if (images.length > 0) output.images = images;
      if (shapes.length > 0) output.shapes = shapes;

    }

    output.object = object;

    return output;

    // extract data from the cache hash
    // remove metadata on each item
    // and return as array
    function extractFromCache(cache) {

      var values = [];
      for (var key in cache) {

        var data = cache[key];
        delete data.metadata;
        values.push(data);

      }
      return values;

    }

  },

  clone: function(recursive) {

    return new this.constructor().copy(this, recursive);

  },

  copy: function(source, recursive) {

    if (recursive === undefined) recursive = true;

    this.name = source.name;

    this.up.copy(source.up);

    this.position.copy(source.position);
    this.quaternion.copy(source.quaternion);
    this.scale.copy(source.scale);

    this.matrix.copy(source.matrix);
    this.matrixWorld.copy(source.matrixWorld);

    this.matrixAutoUpdate = source.matrixAutoUpdate;
    this.matrixWorldNeedsUpdate = source.matrixWorldNeedsUpdate;

    this.layers.mask = source.layers.mask;
    this.visible = source.visible;

    this.castShadow = source.castShadow;
    this.receiveShadow = source.receiveShadow;

    this.frustumCulled = source.frustumCulled;
    this.renderOrder = source.renderOrder;

    this.userData = JSON.parse(JSON.stringify(source.userData));

    if (recursive === true) {

      for (var i = 0; i < source.children.length; i++) {

        var child = source.children[i];
        this.add(child.clone());

      }

    }

    return this;

  }

});


export {
  Object3D
};
