/**
* Created by vouill on 8/20/18.
*/

<template>
    <div class="v-dual-container">
        <slot/>
    </div>
</template>

<style lang="scss" scoped>
.v-dual-container {
  display: flex;
  & > * {
    height: 100vh;
    overflow: scroll;
    &:first-of-type {
      flex-grow: 1;
    }
    &:last-of-type {
      width: 500px;
    }
  }
}
</style>
<script>
export default {
  name: "dual-view-container"
};
</script>
