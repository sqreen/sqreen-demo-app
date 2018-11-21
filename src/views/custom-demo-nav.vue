/**
* Created by vouill on 8/21/18.
*/

<template>

    <div class="v-nav">
        <div class="cover">
            SQREEN SHOP
        </div>
        <nav>
            <div class="flex"><router-link :to="{name: 'customDemo'}">Home</router-link>
            <router-link v-if="!$store.getters.authenticatedEmail" :to="{name: 'login'}">Login</router-link>
            </div>
            <div v-if="$store.getters.authenticatedEmail">
                Hello {{$store.getters.authenticatedEmail}} !
            </div>
        </nav>
    </div>
</template>

<style scoped lang="scss">
.v-nav {
  margin-bottom: 2em;
}
.flex {
  display: flex;
}
.cover {
  padding-top: 1em;
  padding-left: 1em;
  font-size: 30px;
  font-weight: 600;
  height: 100px;
  background-position: center;
  background-size: cover;
  background-image: url("https://images.unsplash.com/photo-1531149209156-122dcea6fdd2?ixlib=rb-0.3.5&ixid=eyJhcHBfaWQiOjEyMDd9&s=3dbc572551e15f53055893f339b9be81&auto=format&fit=crop&w=1534&q=80");
}
nav {
  display: flex;
  justify-content: space-between;
  a {
    padding: 1em;
  }
}
</style>

<script>
export default {
  name: "custom-demo-nav",
  props: {},
  components: {},
  data() {
    return {};
  }
};
</script>
