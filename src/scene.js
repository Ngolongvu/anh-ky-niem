import * as THREE from "three";

export function createScene(color) {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(color);
    return scene;
}