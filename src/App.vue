<template>
  <div id="app">

    <custom-demo/>
  </div>
</template>

<style lang="scss">
#app {
  font-family: "Avenir", Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
}
</style>
<script>
import CustomDemo from "./views/index";
export default {
  components: { CustomDemo }
};
</script>
