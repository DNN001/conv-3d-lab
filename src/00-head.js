/**
 * Conv 3D Lab - Client half.
 *
 * One Web panel for looking at a convolutional network from the inside: the
 * input matrix becomes a stack of channel planes, every convolution/pooling
 * layer hangs behind its predecessor along the flow axis, and a kernel window
 * walks the input in row-major order while the matching cell of the next
 * feature map lights up. Everything on screen is a real number produced by the
 * arithmetic in section 2 - there is no decorative heat map.
 *
 * The scene is projected by hand and painted with the 2D canvas API: no WebGL,
 * no 3D library, no external assets, no network access.
 */
window.__ModuleLoader__.load({
  id: '@local/conv-3d-lab',
  factory(require) {
    'use strict';

    const React = require('react');
    const h = React.createElement;

    const NS = 'conv3d';
    const PANEL_ID = 'conv-3d-lab';
