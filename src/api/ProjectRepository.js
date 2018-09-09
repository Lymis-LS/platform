export class ProjectRepository {
  constructor (defaultClient) {
    this.defaultClient = defaultClient
    this.projectApiClient = new defaultClient.ProjectApi()
  }

  async createNewProject (idCloud, name) {
    try {
      let project = new this.defaultClient.Project()
      // project.
      project.name = name
      const response = await this.projectApiClient.createProject(idCloud, project)
      return response
    } catch (e) {
      console.log(e.statusCode)
    }
  }

  async deleteProject (idCloud, project) {
    try {
      const response = await this.projectApiClient.deleteProject(idCloud, project.id)
      return response
    } catch (e) {
      console.log(e.statusCode)
    }
  }

  async updateProject (idCloud, project) {
    try {
      const response = await this.projectApiClient.updateProject(idCloud, project.id, project)
      return response
    } catch (e) {
      console.log(e.statusCode)
    }
  }
}
