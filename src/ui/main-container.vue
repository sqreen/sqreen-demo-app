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
  max-width: 700px;
  margin: auto;
}
</style>
<script>
export default {
  name: "main-container"
};
</script>
