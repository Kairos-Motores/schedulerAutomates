import { Header } from "../components/Header/Header";
import { AutomationScheduler } from "../components/AutomationScheduler/AutomationScheduler.jsx";
import styled from "./style.module.scss";

export const MainPage = () => {
    return (
        <section className={styled.mainPage}>

            <AutomationScheduler />
        </section>
    );
};