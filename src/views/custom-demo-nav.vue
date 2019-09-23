/**
* Created by vouill on 8/21/18.
*/

<template>
  <div>
    <div class="navigation">
      <div class="logo">Sqreen<span>shop</span>.</div>
      <nav>
        <div>
          <router-link :to="{name: 'customDemo'}">Home</router-link>
          <router-link :to="{name: 'customDemo'}">Mini figurines</router-link>
          <router-link :to="{name: 'customDemo'}">My favorite</router-link> 
        </div>
        <div>
          <router-link v-if="!$store.getters.authenticatedEmail" :to="{name: 'login'}">
            <div class="icon">person_outlined</div>
          </router-link>
          <router-link v-if="!$store.getters.authenticatedEmail" :to="{name: 'login'}">
            <div class="icon">search_outlined</div>
          </router-link>
          <router-link v-if="!$store.getters.authenticatedEmail" :to="{name: 'login'}">
            <div class="icon">shopping_cart_outlined</div>
          </router-link>
        </div>
      </nav>
    </div>
    <div v-if="$store.getters.authenticatedEmail">
        Hello {{$store.getters.authenticatedEmail}} !
    </div>
  </div>
</template>

<style scoped lang="scss">
.navigation {
  padding: 55px 0 20px;
  max-width: 1180px;
  width: 100%;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-content: center;
  align-items: center;

  .logo {
    font-family: 'Muli', sans-serif;
    font-weight: 800;
    font-size: 38px;
    color: #34214a;

    span {
      color: #ff5a6e;
    }
  }

  nav {
    flex-grow: 1;
    display: flex;
    justify-content: space-between;
    margin-left: 65px;

    a {
      font-size: 15px;
      font-weight: 500;
      color: #333;
      display: inline-block;
      padding: 5px 8px;
      transition: .2s ease;
      text-transform: uppercase;
      margin-top: 5px;

      &:hover {
        color: #ff5a6e;
      }
    }

    .icon {
      font-family: 'Material Icons';
      font-weight: normal;
      font-style: normal;
      font-size: 24px;  /* Preferred icon size */
      display: inline-block;
      line-height: 1;
      text-transform: none;
      letter-spacing: normal;
      word-wrap: normal;
      white-space: nowrap;
      direction: ltr;
    }
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
