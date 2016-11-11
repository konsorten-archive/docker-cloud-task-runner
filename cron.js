// Copyright (c) 2016 müller & konsorten e.K.

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

const linkedContainerApiUrlExpression = /^(.*)_TUTUM_API_URL$/g,
  cronjobEnvVarSuffix = '_CRON',
  defaultCronPattern = '* 0 * * * *' // If no cron pattern provided, trigger the action once an hour.

let cron = require('node-cron'),
  request = require('request')

let activeCronjobs = []

// Exit if no env-variable with http auth header is set.
let dockerCloudAuthHeader = process.env['DOCKERCLOUD_AUTH']
if (!dockerCloudAuthHeader) {
  throw ('Missing API permissions.')
}

// Extract cronjob data from all env variables
let cronjobsToAdd = Object.keys(process.env)
  .reduce((processedCronjobList, currentLinkedContainerEnvKey) => {
    let currentLinkedContainerNameParts
    ;(currentLinkedContainerNameParts = linkedContainerApiUrlExpression.exec(currentLinkedContainerEnvKey)) ?
      processedCronjobList.push({
        id: currentLinkedContainerNameParts[1],
        url: process.env[currentLinkedContainerEnvKey] + 'start/',
        pattern: process.env[currentLinkedContainerNameParts[1] + cronjobEnvVarSuffix] || defaultCronPattern
      }) : null
    return processedCronjobList
  }, [])

// Initialize routine for each cronjob obj.
cronjobsToAdd.forEach(cronJob => {
  console.log('Installing ' + cronJob.id + ' job')
  try {
    activeCronjobs.push(cron.schedule(cronJob.pattern, () => {
      console.log('Triggering ' + cronJob.id + ' start')
      request.post({
        url: cronJob.url,
        headers: {
          'Authorization': dockerCloudAuthHeader
        }
      }, (error, response, body) => {
        if (!error && response.statusCode == 202) {
          console.log('Success')
        } else {
          // TODO: Add better error handline
          console.log('Failed')
        }
      })
    }))
    console.log(cronJob.id + ' installed')
  } catch(ex) {
    console.log('Critical error during cronjob installation')
  }
})
