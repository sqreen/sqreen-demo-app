/**
* Created by vouill on 8/21/18.
*/

<template>
    <side-panel-container>
        <h3>Ressource by id page</h3>
        <p>This page has a vulnerability!</p>
        <hidden-message title="Show what is the vulnerability">
            <p>You can query <code><a href="/post/1 UNION SELECT * FROM USERS">{{$route.params.domain}}/posts/1 UNION SELECT * FROM USERS</a></code></p>
            <p>This will trigger a <strong>sql injection</strong></p>
            <p>You can learn more about it <a>here</a>.</p>
            <p>Do you feel like SQL injection are not relevant nowadays ? <br/>
                Check this <a target="_blank" rel="noopener noreferrer" href="https://codecurmudgeon.com/wp/sql-injection-hall-of-shame/">SQL injection hall of shame</a> </p>
        </hidden-message>
    </side-panel-container>
</template>

<script>
import SidePanelContainer from "../../ui/side-panel-container";
import HiddenMessage from "../../ui/hidden-message";
export default {
  name: "PostById",
  components: { HiddenMessage, SidePanelContainer }
};
</script>
