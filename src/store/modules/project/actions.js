/* This file is part of the BIMData Platform package.
(c) BIMData support@bimdata.io
For the full copyright and license information, please view the LICENSE
file that was distributed with this source code. */
import { ProjectRepository } from '@/api/ProjectRepository'
import { IFCRepository } from '@/api/IFCRepository'
import { generateClient } from '@/api/initClient'

export default {
  init ({rootState}) {
    let token = rootState.oidc.access_token
    let defaultClient = generateClient(token)
    this.IFCRepositoryRequest = new IFCRepository(defaultClient)
    this.ProjectRepositoryRequest = new ProjectRepository(defaultClient)
  },
  async getProjectIfcImage (store, params) {
    try {
      let ifcs = await this.IFCRepositoryRequest.getProjectIfcs(params)
      ifcs = ifcs.filter(ifc => ifc.viewer_360_file)
      ifcs.sort(
        (a, b) => (new Date(b.created_at) - new Date(a.created_at))
      )
      return ifcs[0] && ifcs[0].viewer_360_file ? {'id': ifcs[0].id, 'image': ifcs[0].viewer_360_file} : null
    } catch (e) {
      return Promise.reject(e)
    }
  },
  async fetchProjectUsers ({ commit }, project) {
    const users = await this.ProjectRepositoryRequest.getProjectUsers(project.cloud.id, project.id)

    commit('SET_PROJECT_USERS', users)
  },
  async fetchProjectIfc ({ commit }, project) {
    try {
      let params = {
        cloudPk: project.cloud.id,
        projectPk: project.id
      }
      const ifcs = await this.IFCRepositoryRequest.getProjectIfcs(params)
      commit('SET_IFCS', ifcs)

      let hasPendingIfc = false
      let pendingStatus = ['P', 'I']
      for (let ifc of ifcs) {
        if (pendingStatus.includes(ifc.status)) {
          hasPendingIfc = true
        }
      }

      if (hasPendingIfc) {
        const idInterval = setInterval(async () => {
          const ifcsPending = this.IFCRepositoryRequest.getProjectIfcs(params, 'P')
          const ifcsInProcessing = this.IFCRepositoryRequest.getProjectIfcs(params, 'I')
          Promise.all([ ifcsPending, ifcsInProcessing ]).then(async ([resultPending, resultProcessing]) => {
            if (resultPending.length === 0 && resultProcessing.length === 0) {
              const ifcs = await this.IFCRepositoryRequest.getProjectIfcs(params)
              commit('SET_IFCS', ifcs)
              window.clearInterval(idInterval)
            }
          })
        }, 5000)
      }
      return ifcs
    } catch (e) {
      console.error(e)
    }
  },
  async fetchElements ({commit, state}, project) {
    try {
      let elements = []
      for (let ifc of state.ifcs) {
        let params = {
          cloudPk: state.selectedProject.cloud.id,
          projectPk: state.selectedProject.id,
          ifcPk: ifc.id
        }
        const elementResult = await this.IFCRepositoryRequest.getIfcSites(params)
        elements.push({...elementResult[0], ifc: ifc.id})
      }
      commit('SET_ELEMENTS', elements)
      return elements
    } catch (e) {
      console.error(e)
    }
  },
  async getTree ({commit, dispatch, state}, project) {
    try {
      const tree = await this.ProjectRepositoryRequest.getTree(project.cloud.id, project.id)
      commit('SET_TREE', tree)
      commit('SET_CURRENT_FOLDER_ID', tree.id)
      let treeArray = []
      treeArray.push(tree)
      let result = await dispatch('getElement', {tree: treeArray, searchedId: state.currentFolderId})
      commit('SET_CURRENT_ELEMENT', result)
      return tree
    } catch (e) {
      console.error(e)
    }
  },
  toggleFolderOpened ({commit}, folderId) {
    commit('TOGGLE_FOLDER', folderId)
  },
  async getElement (context, {tree, searchedId}) {
    let o
    tree.some(function iter (a) {
      if (a['id'] === searchedId) {
        o = a
        return true
      }
      return Array.isArray(a.children) && a.children.some(iter)
    })
    return o
  },
  async getParent ({dispatch}, {tree, searchedId, paths}) {
    let elt = await dispatch('getElement', {tree, searchedId})
    let pathsCollection = paths
    pathsCollection.push(elt)
    if (elt.parent_id !== null) {
      return dispatch('getParent', {tree, searchedId: elt.parent_id, paths: pathsCollection})
    } else {
      return pathsCollection
    }
  },
  async getPath (context) {
    let treeArray = []
    treeArray.push(context.state.tree)
    let result = await context.dispatch('getParent', {tree: treeArray, searchedId: context.state.currentFolderId, paths: []})
    context.commit('SET_CURRENT_PATH', result.reverse())
  },
  async changeFolder ({commit, dispatch, state}, idFolder) {
    commit('SET_CURRENT_FOLDER_ID', idFolder)
    let treeArray = []
    treeArray.push(state.tree)
    let result = await dispatch('getElement', {tree: treeArray, searchedId: state.currentFolderId})
    commit('SET_CURRENT_ELEMENT', result)
    await dispatch('getPath')
  },
  async deleteDMSElements ({commit, state, dispatch}, DMSElements) {
    let deletedCalls = []
    let idCloud = state.selectedProject.cloud.id
    let idProject = state.selectedProject.id
    for (let DMSElement of DMSElements) {
      let {id, type} = DMSElement
      if (type === 'file') {
        deletedCalls.push(this.ProjectRepositoryRequest.deleteDocument(idCloud, idProject, id))
      } else if (type === 'folder') {
        deletedCalls.push(this.ProjectRepositoryRequest.deleteFolder(idCloud, idProject, id))
      }
    }
    await Promise.all(deletedCalls)
    await dispatch('getTree', state.selectedProject)
  },
  async createFolder ({commit, state, dispatch}, name) {
    let idCloud = state.selectedProject.cloud.id
    let idProject = state.selectedProject.id
    await this.ProjectRepositoryRequest.createFolder(idCloud, idProject, name, state.currentFolderId)

    await dispatch('getTree', state.selectedProject)
  },
  async moveItemsDMS ({commit, state, dispatch}, {idNewParentFolder, items}) {
    let idCloud = state.selectedProject.cloud.id
    let idProject = state.selectedProject.id

    for (let item of items) {
      if (item.type === 'folder') {
        if (idNewParentFolder !== item.id) {
          await this.ProjectRepositoryRequest.updateFolder(idCloud, idProject, item.id, {parent_id: idNewParentFolder})
        }
      } else if (item.type === 'file') {
        await this.ProjectRepositoryRequest.updateDocument(idCloud, idProject, item.id, {parent_id: idNewParentFolder})
      }
    }

    await dispatch('getTree', state.selectedProject)
  },
  async updateName ({commit, state, dispatch}, {type, id, name}) {
    let idCloud = state.selectedProject.cloud.id
    let idProject = state.selectedProject.id

    if (type === 'Folder') {
      await this.ProjectRepositoryRequest.updateFolder(idCloud, idProject, id, {name})
    } else {
      await this.ProjectRepositoryRequest.updateDocument(idCloud, idProject, id, {name})
    }

    await dispatch('getTree', {
      cloud: {
        id: idCloud
      },
      id: idProject
    })
  },
  async remove ({commit, state, dispatch}, {type, id}) {
    let idCloud = state.selectedProject.cloud.id
    let idProject = state.selectedProject.id

    if (type === 'Folder') {
      await this.ProjectRepositoryRequest.deleteFolder(idCloud, idProject, id)
    } else {
      await this.ProjectRepositoryRequest.deleteDocument(idCloud, idProject, id)
    }
    await dispatch('getTree', {
      cloud: {
        id: idCloud
      },
      id: idProject
    })
  },
  async updateProjectName ({commit, state}, {cloudPk, id, name}) {
    try {
      await this.ProjectRepositoryRequest.updateProject(cloudPk, {id, name})
      await this.dispatch('fetchUserCloudsDetails')
      return true
    } catch (e) {
      console.error(e)
    }
  },

  projectInvite (store, {project, invite}) {
    return this.ProjectRepositoryRequest.projectInvite(project.cloud.id, project.id, invite)
  },

  async getProjectGuests ({ commit }, {cloudId, projectId}) {
    const guests = await this.ProjectRepositoryRequest.getProjectInvitations(cloudId, projectId)
    commit('SET_PROJECT_GUESTS', guests)
    return guests
  },

  updateProjectUserRole (store, {cloudId, projectId, userId, role}) {
    return this.ProjectRepositoryRequest
      .updateUserRights(cloudId, userId, projectId, { role })
  },

  deleteProjectUser (store, {cloudId, projectId, userId}) {
    return this.ProjectRepositoryRequest
      .deleteUser({ cloudId, userId, projectId })
  },

  deleteUserPending (store, {cloudPk, projectPk, id}) {
    return this.ProjectRepositoryRequest
      .deleteUserPending({ cloudPk, projectPk, id })
  },

  async configureIfcSiteAddress (store, options) {
    return this.IFCRepositoryRequest.configureIfcSiteAddress(options)
  },
  async createIfcSite (store, options) {
    return this.IFCRepositoryRequest.createIfcSite(options)
  }
}
