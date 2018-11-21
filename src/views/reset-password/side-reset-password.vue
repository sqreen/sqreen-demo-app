/**
* Created by vouill on 8/21/18.
*/

<template>
    <side-panel-container>
        <h3>Ressource by id page</h3>
        <p>This page has vulnerabilities!</p>
        <hidden-message title="Show what is the vulnerability">
            <h4>No rate limiting</h4>
            <ul>
            <li>1. Looking at the response, you can enumerate users of your app</li>
            <li>
                2. Each user email sent, the application should send a reset email to the given email. <br/>
                This means that a user could make you send a enormous amount of emails.
            </li>
            </ul>
            <p>You can learn more about it <a>here</a>.</p>
        </hidden-message>
    </side-panel-container>
</template>

<script>
import SidePanelContainer from "../../ui/side-panel-container";
import HiddenMessage from "../../ui/hidden-message";
export default {
  name: "SideResetPassword",
  components: { HiddenMessage, SidePanelContainer }
};
</script>
