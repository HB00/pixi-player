'use strict';

require('../styles/select.less');
const MiraEditorBase = require('./base-view');
const Point = require('../utils/point');
const Rect = require('../utils/rect');
const { floor, ceil, round, deg, theta, rotate, arrMulti } = require('../utils/math');

class MiraEditorBox extends MiraEditorBase {
  static TAG = 'mira-editor-box';

  init() {
    this.addClass("mirae-box");
    // this.addClass("mirae-center-cross");
    this.scale = 1.0;
    return super.init();
  }

  get nodeView() {
    return this.node.getView();
  }

  bind(node) {
    this.node = node;
    if (node.cropMode) this.addClass("mirae-box-none");
    return this;
  }

  setAnchor(opts) {
    const { x, y } = opts || this.nodeView.anchor;
    this.anchor = { x, y };
    return this.setStyle({ 'transform-origin': `${round(x*100, 1)}% ${round(y*100, 1)}%` });
  }

  setRotate(rotation) {
    if (rotation === undefined) rotation = this.nodeView.rotation;
    this.rotation = rotation % (2*Math.PI);
    const _deg = deg(this.rotation, 1);
    return this.setStyleVars({ '--rotate': `${_deg}deg`, '--revert-rot': `${-_deg}deg`});
  }

  setXY(opts) {
    let [ x, y ] = opts || [this.nodeView.x, this.nodeView.y];
    this.position = new Point({ x, y });
    const { width, height } = this.size;
    x = (x - width * this.anchor.x) * this.scale;
    y = (y - height * this.anchor.y) * this.scale;
    return this.setStyleVars({ '--x': `${floor(x-1)}px`, '--y': `${floor(y-1)}px` });
  }

  setWH(opts) {
    let [ width, height ] = opts || [this.nodeView.width, this.nodeView.height];
    this.size = { width, height };
    width = `${ceil(width*this.scale+2)}px`;
    height = `${ceil(height*this.scale+2)}px`;
    return this.setStyle({ width, height });
  }

  crop() {
    return this;
  }

  move() {
    return this.setXY().refreshHandle();
  }

  resize() { // when resize(w,h), position(x,y) may change together.
    return this.setWH().move();
  }

  rotate() {
    return this.setRotate();
  }

  fit(scale) {
    this.scale = scale;
    return this.setAnchor().setRotate().resize();
  }

  select(selected) {
    if (selected) this.addHandleBox();
    const className = "mirae-selected";
    return selected ? this.addClass(className) : this.removeClass(className);
  }

  points() { // raw metic, without scale!
    const { width: w, height: h } = this.size;
    const x = - w * this.anchor.x;
    const y = - h * this.anchor.y;
    const points = [ [ x, y ], [ x + w, y ], [ x, y + h ], [ x + w, y + h ] ];
    // topLeft, topRight, bottomLeft, bottomRight
    return points.map(pt => {
      return (new Point(pt)).rotate(this.rotation).offset(this.position);
    });
  }

  bounds(proj=null) {
    return Rect.bounds(this.points().map(pt => proj ? proj(pt) : pt));
  }

  addHandleBox() {
    if (this.handleBox) return;
    this.handleBox = document.createElement('div');
    this.handleBox.setAttribute('mira-editor-el', '');
    this.handleBox.classList.add('mirae-box-handles', 'left');
    this.append(this.handleBox);
  }

  refreshHandle() {
    const ctr = this.parentNode;
    if (!this.handleBox || !ctr || !ctr?.classList.contains('mira-editor')) return this;
    const rootRect = this.parentNode.getBoundingClientRect();
    const boxCenter = this.getBoundingClientRect().center;
    const p = boxCenter.rebase(rootRect.center);
    let pos = 'left';
    // 避免居中对齐的元素resize时带来控件位置跳动
    if (Math.abs(p.x) + Math.abs(p.y) > 10) {
      const θ1 = deg(theta(p, { x: rootRect.width, y: rootRect.height }) - this.rotation);
      const θ2 = deg(theta(p, { x: rootRect.width, y: - rootRect.height }) - this.rotation);
      // console.log(p, θ1, θ2);
      if (θ1 < 0 && θ2 < 0) {
        pos = 'top';
      } else if (θ1 < 0 && θ2 > 0) {
        pos = 'right';
      } else if (θ1 > 0 && θ2 < 0) {
        pos = 'left';
      } else {
        pos = 'bottom';
      }
    }

    if (!this.handleBox.classList.contains(pos)) {
      this.handleBox.classList.remove('left', 'right', 'top', 'bottom');
      this.handleBox.classList.add(pos);
      this.setRotate(); // update rotate cursor
    }
    return this;
  }

  remove() {
    if (this.handleBox) this.handleBox.remove();
    super.remove();
  }

  static create({node, scale, container, selected}) {
    return super.create(container).bind(node).select(selected).fit(scale || 1.0);
  }
}

MiraEditorBox.register();
module.exports = MiraEditorBox;