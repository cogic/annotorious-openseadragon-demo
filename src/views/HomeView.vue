<script setup lang="js">
import { ref, onMounted, markRaw } from 'vue';
import OpenSeadragon from 'openseadragon';
import Annotorious from '@recogito/annotorious-openseadragon';
import '@recogito/annotorious-openseadragon/dist/annotorious.min.css';
import BetterPolygon from '@recogito/annotorious-better-polygon/src';
import { parseRectFragment } from '@recogito/annotorious/src/selectors/RectFragment';
import { svgFragmentToShape } from '@recogito/annotorious/src/selectors/EmbeddedSVG';
import { addClass, hasClass, removeClass } from '@recogito/annotorious/src/util/SVG';
import LabelsFormatter from '@/assets/LabelsFormatter';
import IconPolygon from '@/components/icons/IconPolygon.vue';
import IconRectangle from '@/components/icons/IconRectangle.vue';
import IconPlus from '@/components/icons/IconPlus.vue';
import IconMinus from '@/components/icons/IconMinus.vue';
import IconFitWidth from '@/components/icons/IconFitWidth.vue';
import IconStretching from '@/components/icons/IconStretching.vue';
import IconCursorDefaultOutline from '@/components/icons/IconCursorDefaultOutline.vue';
import IconDelete from '@/components/icons/IconDelete.vue';
import IconImport from '@/components/icons/IconImport.vue';
import IconExport from '@/components/icons/IconExport.vue';
import { onUnmounted } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import { isSegmentsIntersect } from '@/assets/segment.js';

const anno = ref();
const curTag = ref();
const curTool = ref();
const oriTool = ref();
const curAnnotaion = ref();
const viewer = ref();
const tools = ref({
  mouse: { id: 'mouse', label: '指针', icon: markRaw(IconCursorDefaultOutline) },
  rectangle: { id: 'rect', label: '矩形', icon: markRaw(IconRectangle) },
  polygon: { id: 'polygon', label: '多边形', icon: markRaw(IconPolygon) },
});
const tags = ref([
  { id: '猫', color: '#3DA5FF' },
  { id: '狗', color: '#41F08A' },
  { id: '兔子', color: '#FFC74D' },
  { id: '老虎', color: '#FF6E25' },
]);
const imageControls = ref({
  zoomInButton: { id: 'zoom-in-btn', label: '放大', icon: markRaw(IconPlus) },
  zoomOutButton: { id: 'zoom-out-btn', label: '缩小', icon: markRaw(IconMinus) },
  homeButton: { id: 'home-btn', label: '还原大小', icon: markRaw(IconFitWidth) },
  fullPageButton: { id: 'full-page-btn', label: '切换全屏', icon: markRaw(IconStretching) },
});
const annotations = ref([]);
const hotkey = 'shift';
const isDrawing = ref(false);

const initAnno = () => {
  const formatter = function (annotation) {
    const tag = annotation.body.find((b) => b.purpose === 'tagging');
    if (tag && tag.value) {
      return {
        className: 'tag-shape',
        shapeStyle: `--tag-color: ${tag.value.color};`,
      };
    }
  };

  OpenSeadragon.setString('Tooltips.ZoomIn', imageControls.value.zoomInButton.label);
  OpenSeadragon.setString('Tooltips.ZoomOut', imageControls.value.zoomOutButton.label);
  OpenSeadragon.setString('Tooltips.Home', imageControls.value.homeButton.label);
  OpenSeadragon.setString('Tooltips.FullPage', imageControls.value.fullPageButton.label);
  viewer.value = OpenSeadragon({
    id: 'image-container',
    tileSources: {
      type: 'image',
      url: '/src/assets/robot.png',
    },
    minZoomImageRatio: 0.1,
    maxZoomPixelRatio: 100000,
    animationTime: 0.5,
    zoomPerClick: 1.5,
    showNavigator: true,
    navigatorPosition: 'BOTTOM_LEFT',
    navigatorBorderColor: '#ccc',
    zoomInButton: imageControls.value.zoomInButton.id,
    zoomOutButton: imageControls.value.zoomOutButton.id,
    homeButton: imageControls.value.homeButton.id,
    fullPageButton: imageControls.value.fullPageButton.id,
    gestureSettingsMouse: {
      clickToZoom: false,
      dragToPan: true,
    },
  });

  const config = {
    disableEditor: true,
    allowEmpty: true,
    drawOnSingleClick: true,
    enableEdgeControls: true,
    handleRadius: 6,
    hotkey: 'null',
    crosshair: true,
    crosshairWithCursor: true,
    // Only works when drawOnSingleClick is true
    addPolygonPointOnMouseDown: true,
    // Whether to remove the original shape synchronously to avoid shape change bounce
    syncRemoveOriginalShape: true,
    // If true, no shapes will be set to hoverd when tools.current.enable is true
    disableHoverWhenToolEnabled: true,
    // For annotorious-better-polygon
    enableMultiPointSelection: false,
    // For annotorious-better-polygon
    hideMidpointOnSmallDistance: true,
    // For annotorious-better-polygon
    polygonCornerDeletable: true,
    formatters: [LabelsFormatter, formatter],
  };

  anno.value = Annotorious(viewer.value, config);
  BetterPolygon(anno.value);

  anno.value.on('createAnnotation', (annotation) => {
    // anno.value.selectAnnotation(annotation);
    // curAnnotaion.value = annotation;
    annotations.value.push(annotation);
    changeDrawingTool(curTool.value);
    isDrawing.value = false;
    // changeDrawingTool(tools.value.mouse);

    onSaveAnnotation(annotation);
  });

  anno.value.on('deleteAnnotation', function (annotation) {
    handleOnDeleteAnnotation(annotation.id);
  });

  anno.value.on('createSelection', (selection) => {
    selection.body = [
      {
        type: 'TextualBody',
        purpose: 'tagging',
        value: curTag.value,
      },
    ];

    anno.value.updateSelected(selection, true);
  });

  anno.value.on('selectAnnotation', (annotation, element) => {
    curAnnotaion.value = annotation;
  });

  anno.value.on('cancelSelected', (selection) => {
    curAnnotaion.value = null;
    onSaveAnnotation(selection);
  });

  anno.value.on('startSelection', (point) => {
    isDrawing.value = true;
  });

  anno.value.on('clickAnnotation', (annotation, element) => {
    console.log('Clicked annotation', annotation);
  });

  anno.value.on('updateAnnotation', (annotation, previous) => {
    console.log('updateAnnotation', annotation, previous);
    onSaveAnnotation(annotation);
  });
};
const changeDrawingTool = (tool) => {
  if (tool === tools.value.mouse) {
    anno.value.setDrawingEnabled(false, true);
    viewer.value.gestureSettingsMouse.dragToPan = true;
  } else {
    const tempCurAnnotation = curAnnotaion.value;
    anno.value.saveSelected();
    anno.value.selectAnnotation();
    tempCurAnnotation && onSaveAnnotation(tempCurAnnotation);

    // setDrawingTool 须于 setDrawingEnabled 前执行，以使得 disableHoverWhenToolEnabled 生效
    anno.value.setDrawingTool(tool?.id);
    anno.value.setDrawingEnabled(true);
    viewer.value.gestureSettingsMouse.dragToPan = false;
  }
  curTool.value = tool;
};
const changeTag = (tag) => {
  curTag.value = tag;
};

const changeAnnotationTag = async (id, tagId) => {
  const annotation = annotations.value.find((a) => a.id === id);
  annotation.body.find((b) => b.purpose === 'tagging').value = tags.value.find(
    (t) => t.id === tagId
  );
};

const selectAnnotation = (id) => {
  anno.value.selectAnnotation(id);
  curAnnotaion.value = anno.value.getAnnotationById(id);
};
const removeAnnotation = (id) => {
  anno.value.removeAnnotation(id);
  handleOnDeleteAnnotation(id);
};

const labelmeToWebAnnotation = (labelmeData) => {
  const image = anno.value._env.image;
  return labelmeData.shapes.map((shape) => {
    let selector;
    if (shape.shape_type === 'rectangle') {
      const { x, y, w, h } = {
        x: shape.points[0][0],
        y: shape.points[0][1],
        w: shape.points[1][0] - shape.points[0][0],
        h: shape.points[1][1] - shape.points[0][1],
      };

      selector = {
        type: 'FragmentSelector',
        conformsTo: 'http://www.w3.org/TR/media-frags/',
        value: `xywh=pixel:${x},${y},${w},${h}`,
      };
    } else {
      const points = shape.points.map((point) => point.join(',')).join(' ');
      selector = {
        type: 'SvgSelector',
        value: `<svg><polygon points=\"${points}\"></polygon></svg>`,
      };
    }

    return {
      '@context': 'http://www.w3.org/ns/anno.jsonld',
      type: 'Annotation',
      id: `#${uuidv4()}`,
      body: [
        {
          type: 'TextualBody',
          purpose: 'tagging',
          value: tags.value.find((t) => t.id === shape.label),
        },
      ],
      target: {
        source: image?.src,
        selector,
      },
    };
  });
};
const webAnnotationToLabelme = (annotations) => {
  const image = anno.value._env.image;
  const shapes = annotations.map((annotation) => {
    return {
      label: findTag(annotation).id,
      points: (() => {
        const selector = function (type) {
          return this.target.selector;
        };

        if (annotation.target.selector.type === 'FragmentSelector') {
          const { x, y, w, h } = parseRectFragment({ ...annotation, selector });
          return [
            [x, y],
            [x + w, y + h],
          ];
        } else {
          return Array.from(svgFragmentToShape({ ...annotation, selector }).points).map((point) => [
            point.x,
            point.y,
          ]);
        }
      })(),
      group_id: null,
      description: '',
      shape_type: (() => {
        if (annotation.target.selector.type === 'FragmentSelector') {
          return 'rectangle';
        } else {
          return 'polygon';
        }
      })(),
      flags: {},
      mask: null,
    };
  });

  return {
    version: '0.0.0',
    flags: {},
    shapes: shapes || [],
    imagePath: image.src,
    imageData: null,
    imageHeight: image.naturalHeight,
    imageWidth: image.naturalWidth,
  };
};
const importAnnotations = () => {
  const input = document.createElement('input');
  input.style.display = 'none';
  input.type = 'file';
  input.setAttribute('accept', 'application/json');
  input.addEventListener('change', (e) => {
    const files = e.target.files;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const annotationList = labelmeToWebAnnotation(JSON.parse(e.target.result));
        annotationList.forEach((annotation) => {
          anno.value.addAnnotation(annotation);
          annotations.value.push(annotation);
          onSaveAnnotation(annotation);
        });
      } catch (error) {
        console.error(error);
      }
    };
    reader.readAsText(files[0]);

    document.body.removeChild(input);
  });

  document.body.appendChild(input);
  input.click();
};
const exportAnnotations = () => {
  const text = JSON.stringify(webAnnotationToLabelme(anno.value.getAnnotations()), null, 4);
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = 'annotations.json';

  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const handleOnDeleteAnnotation = (annotationId) => {
  annotations.value.splice(
    annotations.value.findIndex((a) => a.id === annotationId),
    1
  );
  isDrawing.value = false;
};

const onSaveAnnotation = (annotation) => {
  const hasIntersectingEdges = (points) => {
    const n = points.length;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (i === 0 && j === n - 1) continue;
        const p1 = points[i];
        const p2 = points[(i + 1) % n];
        const p3 = points[j];
        const p4 = points[(j + 1) % n];
        if (isSegmentsIntersect(p1, p2, p3, p4)) {
          return true;
        }
      }
    }
    return false;
  };

  const shape = webAnnotationToLabelme([annotation]).shapes[0];
  if (shape.shape_type === 'polygon') {
    const points = shape.points.map((point) => ({ x: point[0], y: point[1] }));

    const shapeEl = document.querySelector(`.a9s-annotation[data-id='${annotation.id}']`);
    if (shapeEl && hasIntersectingEdges(points) && !hasClass(shapeEl, 'error-shape')) {
      addClass(shapeEl, 'error-shape');
    } else if (shapeEl && hasClass(shapeEl, 'error-shape')) {
      removeClass(shapeEl, 'error-shape');
    }
  }
};

const findTag = (annotation) => {
  return annotation.body.find((b) => b.purpose == 'tagging').value;
};

const onKeyDown = (evt) => {
  if (
    evt.key.toLowerCase() === hotkey &&
    curTool.value !== tools.value.mouse &&
    isDrawing.value === false
  ) {
    oriTool.value = curTool.value;
    changeDrawingTool(tools.value.mouse);
  }
};
const onKeyUp = (evt) => {
  if (
    evt.key.toLowerCase() === hotkey &&
    curTool.value === tools.value.mouse &&
    oriTool.value != null &&
    isDrawing.value === false
  ) {
    changeDrawingTool(oriTool.value);
  }
};

onMounted(() => {
  initAnno();

  changeDrawingTool(tools.value.mouse);
  changeTag(tags.value[0]);

  // BUG: 鼠标选中标注后再次点击标注或拖拽标注，此时鼠标若在标注上，则无法监听到按键事件
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);
});

onUnmounted(() => {
  document.removeEventListener('keydown', onKeyDown);
  document.removeEventListener('keydown', onKeyUp);
});
</script>

<template>
  <div class="wrapper">
    <div class="tool-group btn-group">
      <div
        v-for="tool in tools"
        :key="tool.id"
        :class="{ 'tool-item': true, 'is-active': curTool === tool }"
        :title="tool.label"
        @click="changeDrawingTool(tool)"
      >
        <component :is="tool.icon"></component>
      </div>
    </div>
    <div
      id="image-container"
      :class="{ 'image-container': true, 'edit-mode': curTool === tools.mouse }"
    >
      <div class="image-control-group">
        <div
          v-for="btn in imageControls"
          :id="btn.id"
          :key="btn.id"
          class="image-control-item"
        >
          <component :is="btn.icon"></component>
        </div>
      </div>
    </div>
    <div class="annotation-wrapper">
      <div class="label-group">
        <div>标签：</div>
        <div
          v-for="tag in tags"
          :key="tag.id"
          :class="{ 'label-item': true, 'is-current': curTag === tag }"
          :style="{ borderColor: tag.color, backgroundColor: curTag === tag ? tag.color : '' }"
          @click="changeTag(tag)"
        >
          {{ tag.id }}
        </div>
      </div>
      <div class="annotation-group-wrapper">
        <div class="annotation-handle-box">
          <div
            class="handle-btn"
            @click="importAnnotations"
          >
            <IconImport class="icon" />
            导入
          </div>
          <div
            class="handle-btn"
            @click="exportAnnotations"
          >
            <IconExport class="icon" />
            导出
          </div>
        </div>
        <div class="annotation-group">
          <div
            v-for="(annotation, index) in annotations"
            :key="annotation.id"
            :class="{ 'annotation-item': true, 'is-current': annotation.id === curAnnotaion?.id }"
            :style="{
              borderColor: findTag(annotation).color,
              backgroundColor: annotation.id === curAnnotaion?.id ? findTag(annotation).color : '',
              cursor: curTool === tools.mouse ? 'pointer' : 'default',
            }"
            @click="curTool === tools.mouse && selectAnnotation(annotation.id)"
          >
            <div class="annotation-item-tag">
              {{ index + 1 }}.&nbsp;
              <select
                v-show="curTool === tools.mouse"
                class="tag-select"
                :value="findTag(annotation).id"
                @change="changeAnnotationTag(annotation.id, $event.target.value)"
              >
                <option
                  v-for="tag in tags"
                  :key="tag.id"
                  :value="tag.id"
                >
                  {{ tag.id }}
                </option>
              </select>
              <span v-show="curTool !== tools.mouse">{{ findTag(annotation).id }}</span>
            </div>
            <div
              class="delete-btn"
              title="删除"
              @click.stop="removeAnnotation(annotation.id)"
            >
              <IconDelete />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.wrapper {
  display: grid;
  grid-template:
    'toolbar rightbar' 60px
    'main rightbar' auto
    / 1fr 250px;
  grid-gap: 10px;
  width: 100%;
  height: 100%;
  padding: 10px;
  overflow: hidden;
  background-color: rgb(248 248 248);
}

.tool-group {
  box-sizing: border-box;
  display: flex;
  grid-area: toolbar;
  align-items: center;
  padding: 10px;
  background-color: rgb(255 255 255);
  border: 1px solid #ccc;
  border-radius: 4px;
  transition: all 0.2s;

  .tool-item {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 50px;
    height: 100%;
    font-size: 24px;
    cursor: pointer;
    background-color: #f1f1f1;
    border: 1px solid #ccc;
    border-radius: 4px;
    transition: all 0.3s;

    + .tool-item {
      margin-left: 10px;
    }

    &:hover {
      color: #0078dc;
      border: 1px solid #aaa;
      box-shadow: 0 0 5px 0 rgb(0 0 0 / 10%);
      transform: scale(1.05);
    }

    &:active {
      transform: scale(0.9);
    }

    &.is-active {
      color: #fff;
      background-color: #0078dc;
      border: 1px solid #aaa;
    }
  }
}

.image-container {
  position: relative;
  grid-area: main;
  overflow: hidden;
  background-color: #eee;
  border: 1px solid #ccc;
  border-radius: 4px;

  .image-control-group {
    position: absolute;
    top: 10px;
    left: 10px;
    display: flex;
    flex-direction: column;
    pointer-events: none;

    .image-control-item {
      z-index: 1;
      display: flex !important;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      font-size: 20px;
      cursor: pointer;
      background-color: #ddd;
      border-radius: 50%;
      box-shadow: 0 0 5px 0 rgb(0 0 0 / 53.4%);
      opacity: 0;
      transition: all 0.3s;

      + .image-control-item {
        margin-top: 10px;
      }

      &:hover {
        color: #0078dc;
        transform: scale(1.05);
      }

      &:active {
        transform: scale(0.9);
      }
    }
  }

  &:hover .image-control-group .image-control-item {
    opacity: 1;
  }
}

.annotation-wrapper {
  display: flex;
  flex-direction: column;
  grid-area: rightbar;
  overflow: hidden;
}

.label-group {
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  align-items: center;
  height: 30%;
  padding: 10px;
  overflow: auto;
  background-color: #fff;
  border: 1px solid #ccc;
  border-radius: 4px;

  .label-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 30px;
    padding: 0 20px;
    margin: 5px;
    cursor: pointer;
    background-color: #fff;
    border: 2px solid #ccc;
    border-radius: 4px;
    transition: all 0.3s;

    &:hover {
      background-color: #f1f1f1;
    }

    &.is-current {
      color: #fff;
      box-shadow: 0 0 4px 0 rgb(0 0 0 / 30%);
    }
  }
}

.annotation-group-wrapper {
  display: flex;
  flex-grow: 1;
  flex-direction: column;
  margin-top: 10px;
  background-color: #fff;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.annotation-handle-box {
  display: flex;
  padding: 5px;
  border-bottom: 1px solid #ccc;

  .handle-btn {
    display: flex;
    flex-grow: 1;
    align-items: center;
    justify-content: center;
    height: 36px;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.3s;

    + .handle-btn {
      margin-left: 10px;
    }

    .icon {
      margin-right: 6px;
      font-size: 24px;
    }

    &:hover {
      background-color: #eee;
    }

    &:active {
      background-color: #ccc;
    }
  }
}

.annotation-group {
  flex-grow: 1;
  flex-basis: 10px;
  padding: 10px;
  overflow: auto;

  .annotation-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 50px;
    padding: 0 20px;
    background-color: #fff;
    border: 2px solid #ccc;
    border-radius: 4px;
    transition: all 0.3s;

    + .annotation-item {
      margin-top: 10px;
    }

    &:hover {
      background-color: #f1f1f1;
    }

    &.is-current {
      color: #fff;
      background-color: #0078dc;
    }

    .annotation-item-tag {
      display: flex;
      align-items: center;

      .tag-select {
        height: 30px;
        font-size: inherit;
        cursor: pointer;
        border-radius: 4px;
      }
    }

    .delete-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 25px;
      height: 25px;
      font-size: 20px;
      color: rgb(133 9 9);
      cursor: pointer;
      background-color: #fff;
      border-radius: 4px;
      transition: all 0.3s;

      &:hover {
        color: rgb(231 24 24);
      }
    }
  }
}
</style>

<style lang="scss">
.openseadragon-canvas {
  outline: none;
}

.a9s-selection:not(.improved-polygon),
.a9s-selection.improved-polygon {
  .a9s-outer {
    stroke: rgb(0 0 0 / 35%);
    stroke-width: 3px;
  }

  .a9s-inner {
    stroke: #fff;
    stroke-dasharray: 5 3;
    stroke-width: 2px;
  }
}

.a9s-annotation {
  &.error-shape {
    .a9s-inner {
      fill: red !important;
      stroke: red !important;
    }
  }

  /* stylelint-disable-next-line no-descending-specificity */
  .a9s-outer {
    display: none;
  }

  /* stylelint-disable-next-line no-descending-specificity */
  .a9s-inner {
    fill: var(--tag-color);
    fill-opacity: 0.1;
    stroke: var(--tag-color) !important;
    stroke-width: 1.6;
    transition: fill-opacity 0.2s;
  }

  .a9s-formatter-el foreignObject .a8s-shape-label-wrapper .a8s-shape-label {
    background-color: var(--tag-color);
    border: 1px solid var(--tag-color);
    opacity: 0.8;
    transition:
      opacity 0.2s,
      background-color 0.2s;
  }

  &.hover {
    .a9s-inner {
      fill-opacity: 0.3;
    }

    .a9s-formatter-el foreignObject .a8s-shape-label-wrapper .a8s-shape-label {
      opacity: 1;
    }
  }

  &.editable:not(.improved-polygon),
  &.editable.improved-polygon {
    .a9s-inner {
      fill-opacity: 0.4;
      stroke-dasharray: 5 3;

      &:hover {
        fill: var(--tag-color);
        fill-opacity: 0.3;
      }
    }

    .a9s-handle {
      .a9s-handle-outer,
      .a9s-handle-inner {
        transition:
          fill 0.2s,
          fill-opacity 0.2s,
          stroke 0.2s,
          stroke-width 0.2s;
      }

      &:not(.selected),
      &.selected {
        .a9s-handle-inner {
          fill: var(--tag-color);
          stroke: #000;
          stroke-width: 1;
        }
      }

      &:hover {
        .a9s-handle-outer {
          fill: transparent;
          stroke: #fff;
          stroke-width: 3;
        }

        .a9s-handle-inner {
          fill-opacity: 0.3;
          stroke-width: 2;
        }
      }

      &:active {
        .a9s-handle-outer {
          fill: transparent;
          stroke: #fff;
          stroke-width: 3;
        }

        .a9s-handle-inner {
          cursor: none;
          fill-opacity: 0.1;
          stroke-width: 2;
        }

        ~ .a9s-handle {
          .a9s-handle-inner {
            cursor: none;
          }
        }
      }

      &:hover,
      &:active {
        &.deletable {
          .a9s-handle-inner {
            fill: red;
            fill-opacity: 1;
          }
        }
      }
    }

    .a9s-formatter-el foreignObject .a8s-shape-label-wrapper .a8s-shape-label {
      border-color: #000;
      opacity: 1;
    }
  }
}

.image-container {
  &.edit-mode {
    .a9s-crosshair {
      display: none;
    }
  }

  &:not(.edit-mode) {
    .a9s-annotationlayer {
      cursor: none !important;

      * {
        cursor: none !important;
      }
    }
  }
}
</style>
