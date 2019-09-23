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

<style lang="scss">
  @import url('https://fonts.googleapis.com/css?family=Material+Icons|Material+Icons+Outlined|Muli:400,600,700,800&display=swap');
</style>
