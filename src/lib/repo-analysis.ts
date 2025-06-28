// Repository analysis using LLM
import { makeGitHubRequest, parseGitHubUrl } from './utils';

// Type definitions for the analysis result
export type RepoAnalysisResult = {
  purpose: string;
  handlesData: string;
  audienceAndUse: string;
  sensitiveData: boolean;
};

/**
 * Performs LLM analysis on a repository to determine its purpose, data handling, and target audience
 * 
 * @param repoUrl Full GitHub repository URL
 * @returns Analysis result object or null if analysis failed
 */
export async function analyzeRepositoryWithLLM(repoUrl: string): Promise<RepoAnalysisResult | null> {
  try {
    // Parse the GitHub URL
    const repoInfo = parseGitHubUrl(repoUrl);
    if (!repoInfo) {
      throw new Error("Invalid GitHub repository URL");
    }
    
    const { owner, repo } = repoInfo;
    
    // Get basic repository info
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}`;
    const contentsUrl = `https://api.github.com/repos/${owner}/${repo}/contents`;
    
    // Get repo info and contents
    const [repoResponse, contentsResponse] = await Promise.all([
      makeGitHubRequest(apiUrl),
      makeGitHubRequest(contentsUrl)
    ]);
    
    if (!repoResponse.ok || !contentsResponse.ok) {
      throw new Error(`Failed to fetch repository data: ${repoResponse.status} ${contentsResponse.status}`);
    }
    
    const repoData = await repoResponse.json();
    const contentsData = await contentsResponse.json();
    
    // Prepare data for LLM analysis
    const description = repoData.description || "";
    const topics = repoData.topics || [];
    const fileList = contentsData
      .map((item: any) => `${item.name} (${item.type})`)
      .join(", ");
    
    // Get README content if available
    let readmeContent = "";
    const readmeFile = contentsData.find((file: any) => 
      file.name.toLowerCase().includes('readme')
    );
    
    if (readmeFile) {
      const readmeResponse = await makeGitHubRequest(readmeFile.url);
      if (readmeResponse.ok) {
        const readmeData = await readmeResponse.json();
        if (readmeData.content) {
          readmeContent = atob(readmeData.content); // Decode base64 content
          // Limit to 5000 chars to avoid token limits
          if (readmeContent.length > 5000) {
            readmeContent = readmeContent.substring(0, 5000) + "... [content truncated]";
          }
        }
      }
    }
    
    // Use LLM to analyze the repository
    const prompt = spark.llmPrompt`
      Analyze this GitHub repository information:
      
      Repository: ${owner}/${repo}
      Description: ${description}
      Topics: ${topics.join(", ")}
      Files in root directory: ${fileList}
      
      README content:
      ${readmeContent || "No README content available"}
      
      Please provide a comprehensive analysis addressing these questions:
      
      1. What does this repository appear to do, based on its structure and code?
      2. Does this project handle sensitive data? If so, how?
      3. What kind of developer would use this project and why?
      
      Format your response as JSON with these fields:
      {
        "purpose": "Clear explanation of what the repository does",
        "handlesData": "Analysis of how the repository handles data, particularly sensitive data",
        "audienceAndUse": "Description of the target audience and how they would use this project",
        "sensitiveData": boolean indicating if the project appears to handle sensitive data
      }
    `;
    
    const analysisJson = await spark.llm(prompt, "gpt-4o", true);
    return JSON.parse(analysisJson);
    
  } catch (error) {
    console.error("Repository analysis error:", error);
    return null;
  }
}