/* This file is part of the BIMData Platform package.
(c) BIMData support@bimdata.io
For the full copyright and license information, please view the LICENSE
file that was distributed with this source code. */
export default {
  SET_CLOUD: (state, selectedCloud) => {
    state.selectedCloud = selectedCloud
  },
  SET_PROJECT: (state, selectedProject) => {
    state.selectedProject = selectedProject
  },
  SET_TREE: (state, tree) => {
    state.tree = tree
  },
  SET_IFCS: (state, ifcs) => {
    state.ifcs = ifcs
  },
  SET_ELEMENTS: (state, elements) => {
    state.elements = elements
  },
  SET_CURRENT_FOLDER_ID: (state, currentFolderId) => {
    state.currentFolderId = currentFolderId
  },
  SET_CURRENT_ELEMENT: (state, currentElement) => {
    state.currentElement = currentElement
  },
  SET_CURRENT_PATH: (state, currentPath) => {
    state.currentPath = currentPath
  },
  TOGGLE_FOLDER: (state, folderId) => {
    const isFolderOpened = state.openedFolderIds.includes(folderId)

    if (isFolderOpened) {
      const index = state.openedFolderIds
        .findIndex(item => item === folderId)

      state.openedFolderIds.splice(index, 1)
    } else {
      state.openedFolderIds.push(folderId)
    }
  },
  SET_PROJECT_USERS: (state, users) => {
    state.users = users
  },
  SET_PROJECT_GUESTS: (state, guests) => {
    state.guests = guests
  }
}
