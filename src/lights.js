import * as THREE from "three";
import { Lensflare, LensflareElement } from "jsm/objects/Lensflare.js";

export function createDirectionalLight(scene, color, intensity) {
    const dl = new THREE.DirectionalLight(color, intensity);
    scene.add(dl);
    return dl;
}

export function createPointLight(scene, color, intensity, distance, decay) {
    const pl = new THREE.PointLight(color, intensity, distance, decay);
    scene.add(pl);
    return pl;
}

export function createAmbientLight(scene, color, intensity) {
    const al = new THREE.AmbientLight(color, intensity);
    scene.add(al);
    return al;
}

export function createLensFlare(pointLight) {
    const lensflare = new Lensflare();
    const textureLoader = new THREE.TextureLoader();

    const sizes = [550, 120, 180];
    const distances = [0, 0.45, 0];

    for (let i = 0; i < 3; i++) {
        const texture = textureLoader.load(
            `./public/textures/starblum_${i + 1}.png`
        );

        lensflare.addElement(
            new LensflareElement(
                texture,
                sizes[i],
                distances[i],
                new THREE.Color(0xffffff)
            )
        );
    }

    pointLight.add(lensflare);
}