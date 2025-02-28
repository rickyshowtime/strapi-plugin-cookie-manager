
"use strict"

const cookie = require("./content-types/cookie.json")
const cookieCategory = require("./content-types/cookie-category.json")
const cookiePopup = require("./content-types/cookie-popup.json")
const cookieButton = require('./components/cookie-button.json')

module.exports = ({ strapi }) => {
  const contentTypeSchemas = [cookie, cookieCategory, cookiePopup]
  const contentTypeService = strapi.plugin("content-type-builder").service("content-types")

  // Additional field for popup
  const buttonsFieldSchema = cookieButton
  const buttonsFieldCategory = "shared"
  const buttonsFieldName = "cookie-button"
  const buttonsFieldReferenceAttribute = "buttons"
  const buttonsFieldReferenceContentType = "cookie-popup"
  const custimizabilityFieldReferenceAttribute = "hasCustomizability"
  const custimizabilityFieldReferenceContentType = "cookie-popup"

  // Additional field for cookie
  const keyFieldReferenceAttribute = "key"
  const keyFieldReferenceContentType = "cookie"

  let isLastIndex = false

  const hasRelation = (attribute) => (attribute.type === "relation")

  const getComponent = async (name) => {
    const component = await strapi.components[name]
    return component;
  }

  const getContentType = async (name) => {
    return await strapi.contentType(`api::${name}.${name}`)
  }

  const componentExists = async (name) => {
    try {
      const result = await getComponent(name);
      return (result !== undefined)
    } catch (e) {
      console.log("error", e);
      return null;
    }
  }

  const contentTypeExists = async (contentType) => {
    try {
      const result = await getContentType(contentType.singularName)
      return (result !== undefined)
    } catch (e) {
      console.log("error", e);
      return null;
    }
  }

  const contentTypeHasAttributes = async (contentTypeName) => {
    const currentContentType = await getContentType(contentTypeName)
    return (Object.keys(currentContentType.__schema__.attributes).length > 0)
  }

  const contentTypeHasAttribute = async (contentTypeName, attributeName) => {
    const currentContentType = await getContentType(contentTypeName)
    return (currentContentType.__schema__.attributes.hasOwnProperty(attributeName))
  }

  const createComponent = async (component) => {
      try {
        strapi.reload.isWatching = false

        await strapi
          .plugin('content-type-builder')
          .services.components.createComponent({
            component: {
              category: buttonsFieldCategory,
              displayName: component.info.displayName,
              icon: component.info.icon,
              attributes: component.attributes,
            },
          });
          setImmediate(() => strapi.reload())
          
      } catch (error) {
        console.log(error);
      }
  }

  const createContentType = async (contentType) => {
    try {
      strapi.reload.isWatching = false

      await contentTypeService.createContentType({ contentType: { ...contentType } })
      setImmediate(() => strapi.reload())
    } catch (e) {
      console.log("error", e)
    }
  }

  const updateContentType = async (uid, contentType) => {
    try {
      strapi.reload.isWatching = false

      await contentTypeService.editContentType(uid, { contentType: contentType })
      if (isLastIndex) setImmediate(() => strapi.reload())
    } catch (e) {
      console.log("error", e)
    }
  }

  const setupComponent = async (component) => {
    const isExistent = await componentExists(`${buttonsFieldCategory}.${buttonsFieldName}`);

    if (!isExistent) {
      await createComponent(component)
    }
  }

  const setupContentTypes = async (contentTypes) => {
    for (const [index, contentType] of contentTypes.entries()) {

      const isExistent = await contentTypeExists(contentType)
      const contentTypeName = contentType.singularName
      const uid = `api::${contentTypeName}.${contentTypeName}`
      const withEmptyAttributes = { ...contentType, ...{ "attributes": {} } }

      isLastIndex = ((contentTypes.length - 1) === index)

      if (!isExistent) {
        await createContentType(withEmptyAttributes)
      } else {
        if (!await contentTypeHasAttributes(contentTypeName)) {
          await updateContentType(uid, contentType)
        }

        if (contentTypeName === buttonsFieldReferenceContentType) {
          if (!await contentTypeHasAttribute(contentTypeName, buttonsFieldReferenceAttribute)){
            await updateContentType(uid, contentType)
          }
        }

        if (contentTypeName === custimizabilityFieldReferenceContentType) {
          if (!await contentTypeHasAttribute(contentTypeName, custimizabilityFieldReferenceAttribute)){
            await updateContentType(uid, contentType)
          }
        }

        if (contentTypeName === keyFieldReferenceContentType) {
          for (const attribute of Object.values(contentType.attributes)) {
            if (hasRelation(attribute)) attribute.targetAttribute = attribute.inversedBy
          }
          if (!await contentTypeHasAttribute(contentTypeName, keyFieldReferenceAttribute)){
            await updateContentType(uid, contentType)
          }
        }
      }
    }
  }

  const initializeSetup = async () => {
    await setupComponent(buttonsFieldSchema)
    await setupContentTypes(contentTypeSchemas)
  }

  initializeSetup()
}
