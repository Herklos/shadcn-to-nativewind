module.exports = function (fileInfo, api) {
  const j = api.jscodeshift
  const root = j(fileInfo.source)

  // Helper to check if an import already exists
  const hasImport = (sourceValue, identifier) => {
    return root
      .find(j.ImportDeclaration)
      .some(
        path =>
          path.node.source.value === sourceValue &&
          path.node.specifiers.some(
            spec =>
              j.ImportSpecifier.check(spec) &&
              spec.imported.name === identifier,
          ),
      )
  }

  // Helper to check if a JSX element is used
  const hasJSXElement = tagName => {
    return root
      .find(j.JSXElement)
      .some(path => path.node.openingElement.name.name === tagName)
  }

  // Helper to check if Checkbox is used (special case for input with type="checkbox")
  const hasCheckbox = () => {
    return root
      .find(j.JSXElement, { openingElement: { name: { name: 'input' } } })
      .some(path =>
        path.node.openingElement.attributes.some(
          attr =>
            j.JSXAttribute.check(attr) &&
            attr.name.name === 'type' &&
            attr.value.value === 'checkbox',
        ),
      )
  }

  // Helper to check if Input is used (input elements excluding type="checkbox")
  const hasInput = () => {
    return root
      .find(j.JSXElement, { openingElement: { name: { name: 'input' } } })
      .some(path =>
        path.node.openingElement.attributes.every(
          attr =>
            !(
              j.JSXAttribute.check(attr) &&
              attr.name.name === 'type' &&
              attr.value.value === 'checkbox'
            ),
        ),
      )
  }

  // Transform lucide-react imports to individual @/components/icons/* imports
  root
    .find(j.ImportDeclaration, { source: { value: 'lucide-react' } })
    .forEach(path => {
      const specifiers = path.node.specifiers.filter(spec =>
        j.ImportSpecifier.check(spec),
      )
      if (specifiers.length === 0) return

      // Create new imports for used components only
      specifiers.forEach(spec => {
        const iconName = spec.imported.name
        if (
          hasJSXElement(iconName) &&
          !hasImport(`@/components/icons/${iconName}`, iconName)
        ) {
          const newImport = j.importDeclaration(
            [j.importSpecifier(j.identifier(iconName), j.identifier(iconName))],
            j.literal(`@/components/icons/${iconName}`),
          )
          // Insert each new import individually
          path.insertAfter(newImport)
        }
      })

      // Remove the lucide-react import
      j(path).remove()
    })

  // Add necessary imports only if their corresponding elements are used
  if (
    !hasImport('react-native', 'View') &&
    (hasJSXElement('div') || hasJSXElement('ol'))
  ) {
    root
      .find(j.Program)
      .get('body')
      .unshift(
        j.importDeclaration(
          [j.importSpecifier(j.identifier('View'), j.identifier('View'))],
          j.literal('react-native'),
        ),
      )
  }

  if (!hasImport('expo-image', 'Image') && hasJSXElement('img')) {
    root
      .find(j.Program)
      .get('body')
      .unshift(
        j.importDeclaration(
          [j.importSpecifier(j.identifier('Image'), j.identifier('Image'))],
          j.literal('expo-image'),
        ),
      )
  }

  if (
    !hasImport('@/components/ui/text', 'Text') &&
    (hasJSXElement('p') ||
      hasJSXElement('span') ||
      hasJSXElement('h1') ||
      hasJSXElement('h2') ||
      hasJSXElement('h3') ||
      hasJSXElement('h4') ||
      hasJSXElement('h5') ||
      hasJSXElement('h6') ||
      hasJSXElement('h7') ||
      hasJSXElement('strong') ||
      hasJSXElement('label') ||
      hasJSXElement('Badge') ||
      hasJSXElement('ol') ||
      hasJSXElement('li'))
  ) {
    root
      .find(j.Program)
      .get('body')
      .unshift(
        j.importDeclaration(
          [j.importSpecifier(j.identifier('Text'), j.identifier('Text'))],
          j.literal('@/components/ui/text'),
        ),
      )
  }

  if (
    !hasImport('@/components/ui/button', 'Button') &&
    hasJSXElement('button')
  ) {
    root
      .find(j.Program)
      .get('body')
      .unshift(
        j.importDeclaration(
          [j.importSpecifier(j.identifier('Button'), j.identifier('Button'))],
          j.literal('@/components/ui/button'),
        ),
      )
  }

  if (!hasImport('@/components/ui/checkbox', 'Checkbox') && hasCheckbox()) {
    root
      .find(j.Program)
      .get('body')
      .unshift(
        j.importDeclaration(
          [
            j.importSpecifier(
              j.identifier('Checkbox'),
              j.identifier('Checkbox'),
            ),
          ],
          j.literal('@/components/ui/checkbox'),
        ),
      )
  }

  if (!hasImport('expo-router', 'Link') && hasJSXElement('a')) {
    root
      .find(j.Program)
      .get('body')
      .unshift(
        j.importDeclaration(
          [j.importSpecifier(j.identifier('Link'), j.identifier('Link'))],
          j.literal('expo-router'),
        ),
      )
  }

  if (!hasImport('@/components/ui/input', 'Input') && hasInput()) {
    root
      .find(j.Program)
      .get('body')
      .unshift(
        j.importDeclaration(
          [j.importSpecifier(j.identifier('Input'), j.identifier('Input'))],
          j.literal('@/components/ui/input'),
        ),
      )
  }

  // Transform JSX elements
  root.find(j.JSXElement).forEach(path => {
    const openingElement = path.node.openingElement
    const tagName = openingElement.name.name

    // Convert div to View
    if (tagName === 'div') {
      openingElement.name = j.jsxIdentifier('View')
      if (path.node.closingElement) {
        path.node.closingElement.name = j.jsxIdentifier('View')
      }
    }

    // Convert p to Text
    if (tagName === 'p') {
      openingElement.name = j.jsxIdentifier('Text')
      if (path.node.closingElement) {
        path.node.closingElement.name = j.jsxIdentifier('Text')
      }
    }

    // Convert span, h1-h7, strong to Text
    if (
      ['span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'h7', 'strong'].includes(
        tagName,
      )
    ) {
      openingElement.name = j.jsxIdentifier('Text')
      if (path.node.closingElement) {
        path.node.closingElement.name = j.jsxIdentifier('Text')
      }
    }

    // Convert label to Text
    if (tagName === 'label') {
      openingElement.name = j.jsxIdentifier('Text')
      if (path.node.closingElement) {
        path.node.closingElement.name = j.jsxIdentifier('Text')
      }
    }

    // Convert button to Button
    if (tagName === 'button') {
      openingElement.name = j.jsxIdentifier('Button')
      if (path.node.closingElement) {
        path.node.closingElement.name = j.jsxIdentifier('Button')
      }
    }

    // Convert img to Image
    if (tagName === 'img') {
      openingElement.name = j.jsxIdentifier('Image')
      if (path.node.closingElement) {
        path.node.closingElement.name = j.jsxIdentifier('Image')
      }
      // Transform src to source
      openingElement.attributes = openingElement.attributes.map(attr => {
        if (j.JSXAttribute.check(attr) && attr.name.name === 'src') {
          return j.jsxAttribute(j.jsxIdentifier('source'), attr.value)
        }
        return attr
      })
    }

    // Convert a to Link
    if (tagName === 'a') {
      openingElement.name = j.jsxIdentifier('Link')
      if (path.node.closingElement) {
        path.node.closingElement.name = j.jsxIdentifier('Link')
      }
    }

    // Convert ol to View with flex-col flex gap-1
    if (tagName === 'ol') {
      openingElement.name = j.jsxIdentifier('View')
      if (path.node.closingElement) {
        path.node.closingElement.name = j.jsxIdentifier('View')
      }
      // Update className to include flex-col flex gap-1
      let classNameValue = 'flex flex-col gap-1'
      const classNameAttr = openingElement.attributes.find(
        attr => j.JSXAttribute.check(attr) && attr.name.name === 'className',
      )
      if (classNameAttr && classNameAttr.value.type === 'StringLiteral') {
        classNameValue = `${classNameAttr.value.value} ${classNameValue}`.trim()
      }
      openingElement.attributes = [
        ...openingElement.attributes.filter(
          attr =>
            !(j.JSXAttribute.check(attr) && attr.name.name === 'className'),
        ),
        j.jsxAttribute(j.jsxIdentifier('className'), j.literal(classNameValue)),
      ]
      // Convert li children to Text with list-decimal list-inside
      path.node.children = path.node.children.map(child => {
        if (
          j.JSXElement.check(child) &&
          child.openingElement.name.name === 'li'
        ) {
          child.openingElement.name = j.jsxIdentifier('Text')
          if (child.closingElement) {
            child.closingElement.name = j.jsxIdentifier('Text')
          }
          let liClassName = 'list-decimal list-inside'
          const liClassNameAttr = child.openingElement.attributes.find(
            attr =>
              j.JSXAttribute.check(attr) && attr.name.name === 'className',
          )
          if (
            liClassNameAttr &&
            liClassNameAttr.value.type === 'StringLiteral'
          ) {
            liClassName = `${liClassNameAttr.value.value} ${liClassName}`.trim()
          }
          child.openingElement.attributes = [
            ...child.openingElement.attributes.filter(
              attr =>
                !(j.JSXAttribute.check(attr) && attr.name.name === 'className'),
            ),
            j.jsxAttribute(
              j.jsxIdentifier('className'),
              j.literal(liClassName),
            ),
          ]
        }
        return child
      })
    }

    // Convert input (excluding type="checkbox") to Input
    if (tagName === 'input') {
      const typeAttr = openingElement.attributes.find(
        attr =>
          j.JSXAttribute.check(attr) &&
          attr.name.name === 'type' &&
          attr.value.value === 'checkbox',
      )
      if (!typeAttr) {
        // Convert to Input for non-checkbox inputs
        openingElement.name = j.jsxIdentifier('Input')
        if (path.node.closingElement) {
          path.node.closingElement.name = j.jsxIdentifier('Input')
        }
        // Remove type attribute
        openingElement.attributes = openingElement.attributes.filter(
          attr => !(j.JSXAttribute.check(attr) && attr.name.name === 'type'),
        )
      } else {
        // Handle checkbox inputs
        openingElement.name = j.jsxIdentifier('Checkbox')
        if (path.node.closingElement) {
          path.node.closingElement.name = j.jsxIdentifier('Checkbox')
        }
        // Add checked={true} and onCheckedChange={() => {}}
        openingElement.attributes = [
          ...openingElement.attributes.filter(
            attr => !(j.JSXAttribute.check(attr) && attr.name.name === 'type'),
          ),
          j.jsxAttribute(
            j.jsxIdentifier('checked'),
            j.jsxExpressionContainer(j.literal(true)),
          ),
          j.jsxAttribute(
            j.jsxIdentifier('onCheckedChange'),
            j.jsxExpressionContainer(
              j.arrowFunctionExpression([], j.blockStatement([])),
            ),
          ),
        ]
      }
    }

    // Handle Badge elements: wrap non-JSXElement children in Text
    if (tagName === 'Badge') {
      const children = path.node.children || []
      path.node.children = children.map(child => {
        // Skip if already a JSXElement (like <Text> or other components)
        if (j.JSXElement.check(child)) {
          return child
        }
        // Skip JSXText that is only whitespace
        if (j.JSXText.check(child) && child.value.trim() === '') {
          return child
        }
        // Wrap JSXText or JSXExpressionContainer in Text
        if (j.JSXText.check(child) || j.JSXExpressionContainer.check(child)) {
          const textElement = j.jsxElement(
            j.jsxOpeningElement(j.jsxIdentifier('Text'), []),
            j.jsxClosingElement(j.jsxIdentifier('Text')),
            [child],
          )
          // Add className="text-md font-medium" if child is JSXText
          if (j.JSXText.check(child)) {
            textElement.openingElement.attributes = [
              j.jsxAttribute(
                j.jsxIdentifier('className'),
                j.literal('text-md font-medium'),
              ),
            ]
          }
          return textElement
        }
        return child
      })
    }

    // Replace onClick with onPress, onChange with onChangeText, and transform space classes to gap
    openingElement.attributes = openingElement.attributes
      .map(attr => {
        // Handle className attribute
        if (j.JSXAttribute.check(attr) && attr.name.name === 'className') {
          // Handle StringLiteral className
          if (attr.value.type === 'StringLiteral') {
            let classNameValue = attr.value.value
            let additionalClasses = []

            // Check for space-x-* and add flex-row
            if (classNameValue.match(/space-x-\d+/)) {
              additionalClasses.push('flex-row')
              // Add flex if not already present
              if (!classNameValue.includes('flex')) {
                additionalClasses.push('flex')
              }
            }
            // Check for space-y-* and add flex-col
            if (classNameValue.match(/space-y-\d+/)) {
              additionalClasses.push('flex-col')
              // Add flex if not already present
              if (!classNameValue.includes('flex')) {
                additionalClasses.push('flex')
              }
            }

            // Replace space-x-*, space-y-*, or space-* with gap-*
            classNameValue = classNameValue.replace(
              /(space-x|space-y|space)-(\d+)/g,
              'gap-$2',
            )

            // Append additional classes (flex, flex-row, or flex-col) if any
            if (additionalClasses.length > 0) {
              classNameValue =
                `${classNameValue} ${additionalClasses.join(' ')}`.trim()
            }

            return j.jsxAttribute(
              j.jsxIdentifier('className'),
              j.literal(classNameValue),
            )
          }
          // Handle JSXExpressionContainer (e.g., template literals) by preserving them
          else if (attr.value.type === 'JSXExpressionContainer') {
            return attr // Return unchanged to avoid breaking dynamic classNames
          }
        }
        // Handle onClick to onPress
        if (j.JSXAttribute.check(attr) && attr.name.name === 'onClick') {
          return j.jsxAttribute(j.jsxIdentifier('onPress'), attr.value)
        }
        // Handle onChange to onChangeText
        if (j.JSXAttribute.check(attr) && attr.name.name === 'onChange') {
          if (
            attr.value.type === 'JSXExpressionContainer' &&
            attr.value.expression.type === 'ArrowFunctionExpression' &&
            attr.value.expression.params.length === 1 &&
            attr.value.expression.body.type === 'CallExpression' &&
            attr.value.expression.body.arguments.length === 1 &&
            attr.value.expression.body.arguments[0].type ===
              'MemberExpression' &&
            attr.value.expression.body.arguments[0].object.type ===
              'MemberExpression' &&
            attr.value.expression.body.arguments[0].object.object.name ===
              attr.value.expression.params[0].name &&
            attr.value.expression.body.arguments[0].object.property.name ===
              'target' &&
            attr.value.expression.body.arguments[0].property.name === 'value'
          ) {
            const functionName = attr.value.expression.body.callee.name
            const newArrowFunction = j.arrowFunctionExpression(
              [j.identifier('value')],
              j.callExpression(j.identifier(functionName), [
                j.identifier('value'),
              ]),
            )
            return j.jsxAttribute(
              j.jsxIdentifier('onChangeText'),
              j.jsxExpressionContainer(newArrowFunction),
            )
          }
          // If onChange doesn't match the expected pattern, return unchanged
          return attr
        }
        // Remove type="text" from input elements
        if (
          tagName === 'input' &&
          j.JSXAttribute.check(attr) &&
          attr.name.name === 'type' &&
          attr.value.type === 'StringLiteral' &&
          attr.value.value === 'text'
        ) {
          return null // Remove the attribute
        }
        return attr
      })
      .filter(attr => attr !== null) // Filter out null attributes (e.g., removed type="text")
  })

  return root.toSource()
}
