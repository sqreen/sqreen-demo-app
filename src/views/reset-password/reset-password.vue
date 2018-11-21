/**
* Created by vouill on 8/20/18.
*/

<template>
    <div>
        <custom-demo-nav/>
        <main-container>
            <div class="v-container">
                <form>
                    <div class="field">
                        <label class="label">Email</label>
                        <div class="control has-icons-left has-icons-right">
                            <input class="input " type="email" placeholder="Email input" value="">
                            <span class="icon is-small is-left">
                              <i class="fas fa-envelope"></i>
                            </span>
                        </div>
                    </div>
                </form>
            </div>
        </main-container>
    </div>
</template>

<style scoped>
.v-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 400px;
}
</style>

<script>
import { hoc } from "vuex-api";
import ConnectedPost from "../../components/connectedPost/index";
import MainContainer from "../../ui/main-container";
import CustomDemoNav from "../custom-demo-nav";
export default {
  name: "ResetPassword",
  components: { CustomDemoNav, MainContainer, ConnectedPost, hoc }
};
</script>
