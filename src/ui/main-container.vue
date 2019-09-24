/**
* Created by vouill on 8/20/18.
*/

<template>
    <div class="v-container">
        <slot/>
    </div>
</template>

<style scoped>
.v-container {
  max-width: 1180px;
  width: 100%;
  margin: 0 auto;
}
</style>
<script>
export default {
  name: "main-container"
};
</script>
