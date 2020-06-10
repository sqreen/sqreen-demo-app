String[] TARGETS = ["12"]
// , "10", "12"]
String[] SETUPS = ["express4"]
// , "express4_pm2"]


def runTests(version = '12', setup = 'express4') {

    def branch = env.BRANCH_NAME
    if (branch.startsWith('PR-')) {
        branch = env.CHANGE_BRANCH
    }

    stage('Integration tests: node: ' + version + ' target: ' + setup) {
        build job: 'IntegrationTestsRunDev', parameters: [
                ['$class': 'BooleanParameterValue', name: 'RUN_NODE', value: Boolean.valueOf(true)],
                ['$class': 'BooleanParameterValue', name: 'RUN_RUBY', value: Boolean.valueOf(false)],
                ['$class': 'BooleanParameterValue', name: 'BUILD_BACKEND', value: Boolean.valueOf(false)],
                ['$class': 'BooleanParameterValue', name: 'BUILD_INTEGRATION_TESTS', value: Boolean.valueOf(false)],
                ['$class': 'BooleanParameterValue', name: 'BUILD_NODE', value: Boolean.valueOf(true)],
                ['$class': 'StringParameterValue', name: 'NODE_AGENT_BRANCH', value: String.valueOf("${branch}")],
                ['$class': 'StringParameterValue', name: 'NODE_VERSION', value: String.valueOf("${version}")],
                ['$class': 'StringParameterValue', name: 'NODE_TARGET', value: String.valueOf(setup)],
        ]
    }
}

Object RUNNING_TARGETS = [:]
SETUPS .each { setup ->
    TARGETS.each { it ->
        RUNNING_TARGETS.putAt(it + '_' + setup, { runTests (it, setup) })
    }
}


node('master') {

    parallel RUNNING_TARGETS
}
