/**
* Created by vouill on 8/22/18.
*/

<template>
    <div class="wrap-container">
        <slot/>
    </div>
</template>

<style scoped lang="scss">
.wrap-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, 250px);
  justify-content: center;
  grid-column-gap: 1em;
  grid-row-gap: 1em;
  & > * {
    height: 300px;
    overflow: hidden;
  }
}
</style>

<script>
export default {
  name: "wrap-container",
  props: {},
  components: {},
  data() {
    return {};
  }
};
</script>
