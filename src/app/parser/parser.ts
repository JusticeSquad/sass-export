const VARIABLE_PATERN = '(?!\\d)[\\w_-][\\w\\d_-]*';
const VALUE_PATERN = '[^;]+|"(?:[^"]+|(?:\\\\"|[^"])*)"';
const DECLARATION_PATTERN =
  `\\$['"]?(${VARIABLE_PATERN})['"]?\\s*:\\s*(${VALUE_PATERN})(?:\\s*!(global|default)\\s*;|\\s*;(?![^\\{]*\\}))`;

const MAP_DECLARATIOM_REGEX = /['"]?((?!\d)[\w_-][\w\d_-]*)['"]?\s*:\s*([a-z\-]+\([^\)]+\)|[^\)\(,\/]+|\([^\)]+\))/gi;

const QUOTES_PATTERN = /^(['"]).*\1$/;
const QUOTES_REPLACE = /^(['"])|(['"])$/g;

const SECTION_TAG = 'sass-export-section';
const SECTION_PATTERN = `(@${SECTION_TAG}=)(".+")`;
const SECTION_PARAM_PATTERN = `@param\\s(.+)=['"](.+)['"]`;
const END_SECTION_PATTERN = `(@end-${SECTION_TAG})`;

const DEFAULT_SECTION = 'variables';


export class Parser {
  public static readonly PARAM_SUFFIX = '-params';

  private rawContent: string;

  constructor(rawContent: string) {
    this.rawContent = rawContent;
  }

  public parse(): IDeclaration[] {
    let matches = this.extractDeclarations(this.rawContent);
    let declarations = [];

    for (let match of matches) {
      if (!this.checkIsSectionStart(match) && !this.checkIsSectionStart(match)) {
        let parsed = this.parseSingleDeclaration(match);

        if (parsed) {
          this.parseMapDeclarations(parsed);
          declarations.push(parsed);
        }
      }
    }

    return declarations;
  }


  public parseStructured(): any {
    let matches = this.extractDeclarationsStructured(this.rawContent);
    let currentSection = DEFAULT_SECTION;
    let declarations = {};
    let paramMap = null;

    if (!matches || !matches.length) {
      return {};
    }

    declarations[currentSection] = [];

    for (let match of matches) {
      if (this.checkIsSectionStart(match)) {
        let sectionName = String(new RegExp(SECTION_PATTERN, 'gi').exec(match)[2]);

        if (sectionName) {
          currentSection = sectionName.replace(/"/g, '');
          declarations[currentSection] = declarations[currentSection] || [];
        }
      } else if (this.checkIsSectionEnd(match)) {
        this.setParamMap(declarations, paramMap, currentSection);

        currentSection = DEFAULT_SECTION;
      } else if (this.checkIsSectionParam(match)) {
        if (currentSection === DEFAULT_SECTION)
          continue;
        
        const regexResult = new RegExp(SECTION_PARAM_PATTERN, 'gi').exec(match);
        const paramName = String(regexResult[1]);
        const paramValue = String(regexResult[2]);

        if( paramMap )
          paramMap[paramName] = paramValue;
        else
          paramMap = { [paramName]: paramValue };
      } else {
        let parsed = this.parseSingleDeclaration(match);

        if (parsed) {
          this.parseMapDeclarations(parsed);
          declarations[currentSection].push(parsed);
        }
      }
    }

    this.setParamMap(declarations, paramMap, currentSection);

    return declarations;
  }


  private extractDeclarationsStructured(content: string): [any] {
    const matches = content.match(new RegExp(`${DECLARATION_PATTERN}|${SECTION_PATTERN}|${SECTION_PARAM_PATTERN}|${END_SECTION_PATTERN}`, 'g'));

    if (!matches) {
      return [] as any;
    }

    return matches as any;
  }


  private extractDeclarations(content: string): [any] {
    const matches = content.match(new RegExp(DECLARATION_PATTERN, 'g'));

    if (!matches) {
      return [] as any;
    }

    return matches as any;
  }

  private extractMapDeclarations(content: string): [any] {
    const matches = content.match(new RegExp(MAP_DECLARATIOM_REGEX, 'g'));

    if (!matches) {
      return [] as any;
    }

    return matches as any;
  }


  private parseSingleDeclaration(matchDeclaration: string): IDeclaration {
    let matches = matchDeclaration
      .replace(/\s*!(default|global)\s*;/, ';')
      .match(new RegExp(DECLARATION_PATTERN));

    if (!matches) {
      return;
    }

    let name = matches[1].trim().replace('_', '-');
    let value = matches[2].trim().replace(/\s*\n+\s*/g, ' ');

    if (value.match(QUOTES_PATTERN)) {
      value = value.replace(QUOTES_REPLACE, '');
    }

    return { name, value } as IDeclaration;
  }
  private parseMapDeclarations(parsedDeclaration: IDeclaration) {
    let map = this.extractMapDeclarations(parsedDeclaration.value);

    if (map.length) {
      parsedDeclaration.mapValue = map.map((declaration) => {
        const singleDeclaration = this.parseSingleDeclaration(
          `$${declaration};`
        );
        this.parseMapDeclarations(singleDeclaration);

        return singleDeclaration;
      });
    }
  }

  private checkIsSectionStart(content: string): boolean {
    return (new RegExp(SECTION_PATTERN, 'gi')).test(content);
  }

  private checkIsSectionParam(content: string): boolean {
    return (new RegExp(SECTION_PARAM_PATTERN, 'gi')).test(content);
  }

  private checkIsSectionEnd(content: string): boolean {
    return (new RegExp(END_SECTION_PATTERN, 'gi')).test(content);
  }

  private setParamMap(declarations: any, paramMap: any, currentSection: string): void {
    if( currentSection !== DEFAULT_SECTION && paramMap ) {
      declarations[`${currentSection}${Parser.PARAM_SUFFIX}`] = Object.assign({}, paramMap);
      paramMap = null;
    }
  }
}
