import { OrbitControls } from "jsm/controls/OrbitControls.js";

export function createControl(camera, renderer) {
    return new OrbitControls(camera, renderer.domElement);
}