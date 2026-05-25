// E-Press CI/CD — runs on every push to main (via GitHub webhook).
// Pipeline is deliberately thin: heavy lifting lives in deploy/deploy.sh
// so it's identical whether triggered by Jenkins or run by hand over SSH.
//
// Configure in Jenkins:
//   - New Item → Pipeline named "epress-deploy"
//   - Pipeline → Definition: Pipeline script from SCM
//   - SCM: Git, URL https://github.com/MoctarSidibe/E_press.git, branch */main
//   - Script path: Jenkinsfile
//   - Build Triggers → GitHub hook trigger for GITScm polling
//
// Webhook on GitHub:
//   Repo → Settings → Webhooks → Add
//   Payload URL: http://37.60.240.199:8081/jenkins/github-webhook/
//   Content type: application/json
//   Trigger: Just the push event
//
// Notes:
//   - We deliberately do NOT run npm install / build in the Jenkins workspace.
//     deploy.sh does that inside /var/www/epress so the running app picks it up.
//   - Jenkins runs the script as the same user as the pm2/process (root on this
//     box, per the ombiaexpress pattern).

pipeline {
    agent any

    options {
        timestamps()
        timeout(time: 10, unit: 'MINUTES')
        disableConcurrentBuilds()      // never let two deploys race
        buildDiscarder(logRotator(numToKeepStr: '30'))
    }

    triggers {
        githubPush()
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                sh 'git log -1 --pretty=format:"%h %s (%an)"'
            }
        }

        stage('Backend syntax sanity') {
            steps {
                // Cheap parse check — catches obvious breakage before we touch prod
                sh '''
                    cd backend
                    for f in server.js routes/*.js services/*.js middleware/*.js; do
                        node -c "$f" || exit 1
                    done
                    echo "all backend JS parses cleanly"
                '''
            }
        }

        stage('Deploy') {
            steps {
                // The actual deploy. deploy.sh is in /var/www/epress already
                // (created on first install), but we run the in-repo copy so a
                // change to the script itself lands without manual sync.
                sh '''
                    bash /var/www/epress/deploy/deploy.sh
                '''
            }
        }
    }

    post {
        success {
            echo "✅ Deployed ${env.GIT_COMMIT?.take(7)} to https://epress.ga"
        }
        failure {
            echo "❌ Deploy failed. Check stage logs above and:"
            echo "   pm2 logs epress-backend --lines 50"
            echo "   tail -50 /var/log/nginx/epress.error.log"
        }
    }
}
