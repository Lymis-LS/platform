import _ from 'lodash'

export const getToken = state => state.token

export const getCurrentUserFirstname = state => state.oidc.user
  ? state.oidc.user.given_name : null

export const getCurrentUserLastname = state => state.oidc.user
  ? state.oidc.user.family_name : null

export const getCurrentUserId = state => state.currentUser.id

export const getCurrentUserEmail = state => state.currentUser.email

export const getCloudsDetails = state => state.clouds

export const getCurrentCloud = (state) => {
  return state.currentCloud
}

export const getCurrentProject = (state) => {
  return state.currentProject
}

export const getCloudProjects = (state, idCloud) => {
  return state.projects.filter(elt => {
    return idCloud === elt.cloud.id
  })
}

export const getProjectsByCreatedDate = (state) => {
  return _.orderBy(state.projects, p => p.created_at, 'desc')
}

export const getCurrentCloudProjects = (state) => {
  return state.projects.filter(project => {
    return state.currentCloud.id === project.cloud.id
  })
}

export const getCloudById = state => idCloud => {
  return state.clouds.find(cloud => {
    return parseInt(idCloud) === cloud.id
  })
}

export const getProjectById = state => idProject => {
  return state.projects.find(project => {
    return parseInt(idProject) === project.id
  })
}