<script setup>
import HomeView from '@/views/HomeView.vue'
</script>

<template>
  <div class="container">
    <header>
      <div class="drag-bar"></div>
    </header>
    <div id="header-bar"></div>
    <main>
      <HomeView />
    </main>
    <footer></footer>
  </div>
</template>

<style lang="scss">
@use "sass:math";

.container {
  display: grid;
  grid-template:
    'sidebar header' 50px
    'sidebar main' calc(100% - 150px)
    'sidebar footer' 100px
    / 150px 1fr;
  width: 100%;
  height: 100%;

  header {
    position: relative;
    grid-area: sidebar;
    border-right: 1px solid #ccc;

    .drag-bar {
      $width: 3px;

      position: absolute;
      top: 0;
      right: -(math.div($width, 2));
      width: $width;
      height: 100%;
      background-color: red;
      opacity: 0;
      transition: opacity 0.3s;

      &:hover {
        cursor: col-resize;
        opacity: 1;
      }
    }
  }

  #header-bar {
    grid-area: header;
    border-bottom: 1px solid #ccc;
  }

  main {
    grid-area: main;
  }

  footer {
    grid-area: footer;
    border-top: 1px solid #ccc;
  }
}
</style>
