export default (entityConfig, item, updateData) => {
  if (entityConfig.validate) {
    let mergeValidation = Object.assign({},{
      errors: item.errors,
      warnings: item.warnings
    });  
    const validation = entityConfig.validate(updateData);
    validation.errors.forEach(e => {
      if (!mergeValidation.errors.find(me => e.code === e.code)) {
        mergeValidation = Object.assign({},mergeValidation,{
          errors: [...mergeValidation.errors, e]
        });
      }
    });
    validation.warnings.forEach(w => {
      if (!mergeValidation.warnings.find(mw => w.code === w.code)) {
        mergeValidation = Object.assign({},mergeValidation,{
          warnings: [...mergeValidation.warnings, w]
        });
      }
    });

    return Object.assign({}, updateData, {
      errors: mergeValidation.errors ? mergeValidation.errors : [],
      warnings: mergeValidation.warnings ? mergeValidation.warnings : []
    })    
  } else {
    return Object.assign({}, updateData, {
      errors: [],
      warnings: []
    });
  }
}
